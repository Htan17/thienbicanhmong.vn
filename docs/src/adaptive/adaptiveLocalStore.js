import { ALEP_CONFIG as C } from './adaptiveConfig.js';
import { uidHash, normalizeAttempt } from './adaptiveTypes.js';
import { buildProfiles } from './masteryCalculator.js';

// LƯU TRỮ BẢN THỬ NGHIỆM (prototype): localStorage của trình duyệt, khoá theo mã ẩn danh HS-xxxxxx.
// KHÔNG ghi Firestore, không đụng Rules / cấu trúc dữ liệu hiện có. Dữ liệu chỉ nằm trên thiết bị này
// => chưa phải dữ liệu nghiên cứu chính thức. Mọi thao tác bọc try/catch; lỗi lưu không ảnh hưởng app.
const defaultStorage = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
const keyOf = (uid) => `${C.storage.keyPrefix}${uidHash(uid)}`;

export const loadAttempts = (uid, storage = defaultStorage()) => {
    if (!uid || !storage) return [];
    try {
        const arr = JSON.parse(storage.getItem(keyOf(uid)) || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
};

// Thêm các lượt mới (chuẩn hoá lại, bỏ trùng attemptId, giữ tối đa N lượt gần nhất). Trả về true nếu lưu được.
export const appendAttempts = (uid, attempts, storage = defaultStorage()) => {
    if (!uid || !storage || !Array.isArray(attempts) || !attempts.length) return false;
    try {
        const old = loadAttempts(uid, storage);
        const ids = new Set(old.map(a => a && a.attemptId).filter(Boolean));
        const add = attempts.map(normalizeAttempt).filter(a => a && !(a.attemptId && ids.has(a.attemptId)));
        if (!add.length) return true;
        const all = old.concat(add).slice(-C.storage.maxAttemptsPerUser);
        storage.setItem(keyOf(uid), JSON.stringify(all));
        return true;
    } catch (e) { return false; }
};

export const loadProfiles = (uid, now = Date.now(), storage = defaultStorage()) => buildProfiles(loadAttempts(uid, storage), now);
