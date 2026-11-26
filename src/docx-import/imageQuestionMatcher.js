import { DOCX_IMPORT_CONFIG as CFG, UNRESOLVED_REASON as WHY } from './docxImportTypes.js';
import { SECTION_DEFS, SECTION_BY_ID, sectionIdForType, normalizeType } from '../quiz-v2/questionTypes.js';

// Trạng thái xem trước: { questions:[{..., imageIds}], unresolved:[{id,reason}] }. Mọi thao tác trả về BẢN MỚI.
// Bất biến: một ảnh chỉ nằm ở MỘT nơi (một câu hoặc danh sách chưa gắn).
const clone = (st) => ({ questions: st.questions.map(q => ({ ...q, imageIds: [...q.imageIds] })), unresolved: st.unresolved.map(u => ({ ...u })), dropped: [...(st.dropped || [])] });
const detach = (st, id) => { st.questions.forEach(q => { q.imageIds = q.imageIds.filter(x => x !== id); }); st.unresolved = st.unresolved.filter(u => u.id !== id); };

// GĐ2: thứ tự câu trong preview = thứ tự PHẦN I -> IV (giữ thứ tự tương đối trong phần); câu chưa rõ phần xếp cuối. Mảng questions LUÔN đúng thứ tự hiển thị/đánh số.
const rankOf = (q) => { const sid = q.sectionId && SECTION_BY_ID[q.sectionId] ? q.sectionId : (q.type && q.type !== 'unknown' ? sectionIdForType(q.type) : null); const r = SECTION_DEFS.findIndex(x => x.id === sid); return r === -1 ? SECTION_DEFS.length : r; };
const regroup = (st) => { st.questions = st.questions.map((q, i) => ({ q, i })).sort((a, b) => (rankOf(a.q) - rankOf(b.q)) || (a.i - b.i)).map(x => x.q); return st; };

export const buildState = (parsed) => regroup(clone({ questions: parsed.questions, unresolved: parsed.unresolved }));
export const assignImage = (state, imgId, qIndex) => {
    const st = clone(state); if (!st.questions[qIndex]) return state;
    detach(st, imgId); st.questions[qIndex].imageIds.push(imgId); return st;
};
export const removeImage = (state, imgId) => { const st = clone(state); detach(st, imgId); st.unresolved.push({ id: imgId, reason: WHY.REMOVED }); return st; };
export const setPrimary = (state, qIndex, imgId) => {
    const st = clone(state); const q = st.questions[qIndex]; if (!q || !q.imageIds.includes(imgId)) return state;
    q.imageIds = [imgId, ...q.imageIds.filter(x => x !== imgId)]; return st;
};
export const imageStatus = (q) => (q.imageIds.length === 0 ? 'none' : q.imageIds.length === 1 ? 'matched' : 'multiple');

// Câu hỏi cuối cùng để lưu: GIỮ NGUYÊN q, o, c, type; chỉ BỔ SUNG img, images. dataOf(id) trả data URI sẽ lưu.
// GĐ2: các trường V2 của câu (chỉ giữ khi có nghĩa với loại câu)
const V2_FIELDS = ['answerType', 'tolerance', 'acceptedAnswers', 'caseSensitive', 'rubric', 'maxScore', 'sampleAnswer'];
export const finalizeQuestions = (state, dataOf) => {
    // GĐ2: sắp theo PHẦN I -> IV (giữ thứ tự trong phần) rồi đánh lại số thứ tự
    const ordered = regroup({ questions: state.questions.map(q => ({ ...q })) }).questions;
    return ordered.map(q => {
        const images = q.imageIds.map(dataOf).filter(Boolean);
        const out = { id: q.id, index: 0, q: q.q, o: q.o, c: q.c, type: q.type, img: images[0] || null, images };
        { const sid = q.sectionId || (q.type !== 'unknown' ? sectionIdForType(q.type) : null); if (sid) out.sectionId = sid; }
        V2_FIELDS.forEach(k => { if (q[k] !== undefined) out[k] = q[k]; });
        if (typeof q.parseConfidence === 'number') out.parseConfidence = q.parseConfidence; // GĐ1: dữ liệu sạch cho Storage V2 (không có imageIds/parseReason/tfPartial)
        if (typeof q.requiresReview === 'boolean') out.requiresReview = q.requiresReview;
        return out;
    }).map((q, i) => ({ ...q, index: i + 1 }));
};

// Cảnh báo cho màn xem trước
export const computeWarnings = (state, images, parsedWarnings = []) => {
    const w = [...parsedWarnings];
    const byId = {}; images.forEach(i => { byId[i.id] = i; });
    state.questions.forEach((q, i) => { if (q.imageIds.length > 1) w.push(`Câu ${i + 1}: Một câu có nhiều ảnh.`); });
    state.unresolved.forEach(u => {
        const im = byId[u.id];
        if (im && !im.readable) w.push(`${u.id}: Không đọc được một ảnh trong DOCX${im.reason ? ' (' + im.reason + ')' : ''}.`);
        else w.push(`${u.id}: Ảnh này chưa được gắn với câu hỏi.`);
    });
    images.forEach(im => { if (im.readable && im.bytes > CFG.warnOriginalImageBytes) w.push(`${im.id}: Ảnh vượt kích thước đề xuất (${Math.round(im.bytes / 1024)} KB, sẽ được nén).`); });
    return w;
};

// ===== GIAI ĐOẠN 1: sửa / xóa câu trong preview (chỉ đổi state tạm; KHÔNG chạm ảnh trừ khi người dùng chọn rõ) =====
// Sửa q/o/c/type của 1 câu. imageIds, sourceNo, id luôn giữ nguyên. Người dùng đã sửa+xác nhận -> hết "cần kiểm tra".
export const updateQuestion = (state, qIndex, fields) => {
    const st = clone(state); const q = st.questions[qIndex]; if (!q) return state;
    const next = { ...q, q: fields.q, o: fields.o, c: fields.c, type: fields.type, parseConfidence: 1, parseReason: 'Người dùng đã sửa và xác nhận.', requiresReview: false };
    delete next.tfPartial; delete next.expectedType;
    V2_FIELDS.forEach(k => { delete next[k]; if (fields[k] !== undefined) next[k] = fields[k]; }); // đổi loại -> bỏ trường V2 của loại cũ
    next.sectionId = sectionIdForType(fields.type); // phần luôn khớp loại câu sau khi người dùng xác nhận
    st.questions[qIndex] = next; return regroup(st);
};
// Xóa 1 câu khỏi state preview. imageAction: 'unassign' (ảnh về danh sách chưa gắn) | 'drop' (bỏ ảnh khỏi phiên import). Không ảnh -> bỏ qua imageAction.
// Không ảnh nào bị ghép sang câu kế tiếp; các câu còn lại giữ nguyên q/o/c/type (thứ tự hiển thị tự đánh lại theo vị trí).
export const deleteQuestion = (state, qIndex, imageAction = 'unassign') => {
    const st = clone(state); const q = st.questions[qIndex]; if (!q) return state;
    if (q.imageIds.length) {
        if (imageAction === 'drop') st.dropped.push(...q.imageIds);
        else q.imageIds.forEach(id => st.unresolved.push({ id, reason: WHY.REMOVED }));
    }
    st.questions.splice(qIndex, 1); return st;
};

// ===== GIAI ĐOẠN 2 (Quiz Engine V2): chuyển câu sang phần khác / thêm câu / gom nhóm theo phần =====
// Chuyển câu sang PHẦN khác: đổi loại theo phần đích, GIỮ nội dung, lựa chọn, ảnh. Đáp án cần được xác nhận lại nên câu bị đánh dấu cần kiểm tra.
export const moveQuestionToSection = (state, qIndex, sectionId) => {
    const st = clone(state); const q = st.questions[qIndex]; const sec = SECTION_BY_ID[sectionId]; if (!q || !sec) return state;
    if (q.type === sec.type && q.sectionId === sectionId) return state;
    const keepOptions = sec.type === 'single' || sec.type === 'truefalse';
    const next = { ...q, type: sec.type, sectionId, c: sec.type === 'essay' ? '' : (sec.type === 'truefalse' ? [] : (sec.type === 'short' ? (q.type === 'short' && q.c != null ? String(q.c) : null) : null)), o: keepOptions ? (q.o && q.o.length ? q.o : ['', '', '', '']) : (sec.type === 'essay' ? [] : (q.o || [])), parseConfidence: 0.4, requiresReview: true, parseReason: `Đã chuyển sang ${sec.title}: hãy kiểm tra lại loại câu và đáp án.` };
    delete next.tfPartial; delete next.expectedType; V2_FIELDS.forEach(k => { delete next[k]; });
    if (sec.type === 'short') next.answerType = 'number';
    if (sec.type === 'truefalse') next.tfPartial = (next.o || []).map(() => null); // chưa đánh dấu ý nào: buộc người dùng chọn Đúng/Sai
    st.questions[qIndex] = next; return regroup(st);
};
// Thêm câu trống vào cuối một PHẦN. Câu chưa hợp lệ nên chặn lưu cho tới khi nhập đủ. Trả { state, index } (index = vị trí câu mới để mở form sửa).
export const addQuestion = (state, sectionId) => {
    const sec = SECTION_BY_ID[sectionId]; if (!sec) return { state, index: -1 };
    const st = clone(state);
    const n = st.questions.reduce((m, q) => { const k = /(\d+)$/.exec(String(q.id || '')); return Math.max(m, k ? parseInt(k[1], 10) : 0); }, 0) + 1;
    const nq = { id: 'dq_new' + String(n).padStart(3, '0'), q: '', o: sec.type === 'single' || sec.type === 'truefalse' ? ['', '', '', ''] : [], c: sec.type === 'single' ? null : sec.type === 'truefalse' ? [] : sec.type === 'essay' ? '' : null, type: sec.type, sectionId, imageIds: [], sourceNo: 0, parseConfidence: 0.4, requiresReview: true, parseReason: 'Câu thêm thủ công: hãy nhập nội dung và đáp án.' };
    if (sec.type === 'short') nq.answerType = 'number';
    if (sec.type === 'truefalse') nq.tfPartial = [null, null, null, null];
    st.questions.push(nq); regroup(st);
    return { state: st, index: st.questions.findIndex(x => x.id === nq.id) };
};
// Gom chỉ số câu theo phần để hiển thị: [{ id, title, items:[chỉ số trong state.questions] }]. Câu chưa rõ phần xếp vào nhóm 'unknown' (cuối).
export const groupBySection = (questions) => {
    const groups = SECTION_DEFS.map(s => ({ id: s.id, title: s.title, items: [] })); const rest = { id: 'unknown', title: '⚠️ CHƯA XÁC ĐỊNH PHẦN', items: [] };
    (questions || []).forEach((q, i) => { const sid = q.sectionId || (q.type && q.type !== 'unknown' ? sectionIdForType(q.type) : null); const g = groups.find(x => x.id === sid); (g || rest).items.push(i); });
    return [...groups, rest].filter(g => g.items.length);
};
export { normalizeType };
