/*
 * KIỂM DUYỆT CỘNG ĐỒNG (Lộ trình #3): báo cáo / ẩn nội dung vi phạm cho quản trị viên.
 *
 * Mô hình dữ liệu Firestore (CHỈ THÊM MỚI - không đổi cấu trúc dữ liệu cũ):
 *   admins/{uid}            : tồn tại = là quản trị viên. Chỉ tạo bằng tay trong Firebase Console (client không ghi được).
 *   reports/{uid__type__id} : báo cáo của 1 người cho 1 đối tượng (mỗi người chỉ báo cáo 1 lần / đối tượng).
 *   hiddenContent/{type__id}: đối tượng đã bị quản trị viên ẩn (mọi người đọc được để che nội dung; chỉ admin ghi).
 * type ∈ user | guild | quiz | video.
 */
import { firestore } from '../config/firebase.js';
import { safeGetItem, safeSetItem } from './storage.js';
import { sanitizePublicText } from './contentFilter.js';

export const TARGET_TYPES = { user: 'Đạo hữu', guild: 'Tông môn', quiz: 'Bí Tịch (mã chia sẻ)', video: 'Mã video chia sẻ' };
export const REPORT_REASONS = [
    { id: 'abuse', label: 'Thô tục / xúc phạm' },
    { id: 'sexual', label: 'Nhạy cảm / khiêu dâm' },
    { id: 'scam', label: 'Lừa đảo / quảng cáo / cờ bạc' },
    { id: 'impersonate', label: 'Giả mạo quản trị viên' },
    { id: 'privacy', label: 'Lộ thông tin cá nhân' },
    { id: 'other', label: 'Lý do khác' },
];
export const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map(r => [r.id, r.label]));
export const HIDDEN_PLACEHOLDER_TEXT = '[Nội dung đã bị quản trị viên ẩn]';
export const HIDDEN_GUILD_LABEL = '🚫 Tông môn đã bị ẩn';
const HIDDEN_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#18181b"/><text x="60" y="72" font-size="48" text-anchor="middle" fill="#52525b">🚫</text></svg>');

// ---------- Khoá & định dạng ----------
export const hiddenKey = (type, id) => `${type}__${encodeURIComponent(String(id))}`;
export const reportDocId = (reporterUid, type, id) => `${reporterUid}__${hiddenKey(type, id)}`;

// ---------- Che nội dung bị ẩn (áp dụng ở phía hiển thị) ----------
export const maskUser = (u, hidden) => (hidden && hidden.has(hiddenKey('user', u.uid)))
    ? { ...u, photo: HIDDEN_AVATAR, bgImage: '', bio: HIDDEN_PLACEHOLDER_TEXT, name: '[đã ẩn]', _hidden: true } : u;
export const maskGuilds = (dict, hidden) => {
    if (!hidden || hidden.size === 0) return dict;
    const out = {};
    for (const [k, g] of Object.entries(dict)) out[k] = hidden.has(hiddenKey('guild', k)) ? { ...g, notice: HIDDEN_PLACEHOLDER_TEXT, _hidden: true } : g;
    return out;
};
export const guildLabel = (g) => (g && g._hidden) ? HIDDEN_GUILD_LABEL : (g && g.name);

// ---------- Báo cáo (người dùng thường) ----------
const RATE_KEY = 'tk_report_log_v1', RATE_MAX = 10, RATE_WINDOW = 60 * 60 * 1000;
const readLog = () => { try { const a = JSON.parse(safeGetItem(RATE_KEY) || '[]'); return Array.isArray(a) ? a.filter(t => Date.now() - t < RATE_WINDOW) : []; } catch (e) { return []; } };
export const canReportNow = () => readLog().length < RATE_MAX; // giới hạn phía client để chống spam (không thay thế được kiểm soát phía máy chủ)

/** Trả về { ok: true } | { ok: false, code: 'already' | 'rate' | 'denied' | 'error', message } */
export const submitReport = async ({ reporterUid, type, id, label, reason, note }) => {
    if (!reporterUid || !TARGET_TYPES[type] || !id) return { ok: false, code: 'error', message: 'Thiếu thông tin báo cáo.' };
    if (!REASON_LABEL[reason]) return { ok: false, code: 'error', message: 'Hãy chọn lý do báo cáo.' };
    if (!canReportNow()) return { ok: false, code: 'rate', message: 'Bạn báo cáo quá nhanh. Hãy thử lại sau ít phút.' };
    const ref = firestore.collection('reports').doc(reportDocId(reporterUid, type, id));
    try {
        const ex = await ref.get();
        if (ex.exists) return { ok: false, code: 'already', message: 'Bạn đã báo cáo nội dung này rồi. Quản trị viên sẽ xem xét.' };
        await ref.set({
            targetType: type, targetId: String(id).slice(0, 200), targetLabel: sanitizePublicText(label || '', 80),
            reason, note: sanitizePublicText(note || '', 200), reporter: reporterUid, status: 'open',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        safeSetItem(RATE_KEY, JSON.stringify([...readLog(), Date.now()]));
        return { ok: true };
    } catch (e) {
        if (e && e.code === 'permission-denied') return { ok: false, code: 'denied', message: 'Chưa có quyền gửi báo cáo (cần cập nhật Firestore Rules - xem README).' };
        return { ok: false, code: 'error', message: 'Không gửi được báo cáo: ' + ((e && e.message) || 'lỗi không rõ') };
    }
};

// ---------- Đọc danh sách ẩn (mọi người dùng đã đăng nhập) ----------
export const subscribeHidden = (onChange) => {
    try {
        return firestore.collection('hiddenContent').onSnapshot(
            snap => { const docs = {}; snap.forEach(d => { docs[d.id] = d.data(); }); onChange(new Set(Object.keys(docs)), docs); },
            () => onChange(new Set(), {}) // lỗi/rules chưa cập nhật: coi như chưa có nội dung bị ẩn, KHÔNG làm sập app
        );
    } catch (e) { onChange(new Set(), {}); return () => {}; }
};

// ---------- Quản trị viên ----------
export const checkIsAdmin = async (uid) => {
    if (!uid) return false;
    try { return (await firestore.collection('admins').doc(uid).get()).exists; } catch (e) { return false; }
};
export const fetchOpenReports = async () => {
    const snap = await firestore.collection('reports').where('status', '==', 'open').limit(300).get();
    const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
};
/** Gộp báo cáo theo đối tượng, nhiều báo cáo nhất lên đầu. */
export const groupReports = (list) => {
    const m = new Map();
    for (const r of list) {
        const key = hiddenKey(r.targetType, r.targetId);
        const g = m.get(key) || { key, type: r.targetType, id: r.targetId, label: r.targetLabel || '', count: 0, reasons: {}, notes: [], reportIds: [] };
        g.count++; g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1; g.reportIds.push(r.id);
        if (r.note && g.notes.length < 5) g.notes.push(r.note);
        if (r.targetLabel && !g.label) g.label = r.targetLabel;
        m.set(key, g);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
};
const stamp = () => firebase.firestore.FieldValue.serverTimestamp();
export const hideTarget = async (adminUid, group, reason) => {
    const batch = firestore.batch();
    batch.set(firestore.collection('hiddenContent').doc(group.key), { targetType: group.type, targetId: String(group.id).slice(0, 200), reason: reason || 'abuse', hiddenBy: adminUid, hiddenAt: stamp() });
    group.reportIds.forEach(rid => batch.update(firestore.collection('reports').doc(rid), { status: 'hidden', reviewedBy: adminUid, reviewedAt: stamp() }));
    await batch.commit();
};
export const dismissReports = async (adminUid, group) => {
    const batch = firestore.batch();
    group.reportIds.forEach(rid => batch.update(firestore.collection('reports').doc(rid), { status: 'dismissed', reviewedBy: adminUid, reviewedAt: stamp() }));
    await batch.commit();
};
export const unhideTarget = async (key) => { await firestore.collection('hiddenContent').doc(key).delete(); };
