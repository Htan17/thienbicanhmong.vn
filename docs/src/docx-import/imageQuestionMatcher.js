import { DOCX_IMPORT_CONFIG as CFG, UNRESOLVED_REASON as WHY } from './docxImportTypes.js';

// Trạng thái xem trước: { questions:[{..., imageIds}], unresolved:[{id,reason}] }. Mọi thao tác trả về BẢN MỚI.
// Bất biến: một ảnh chỉ nằm ở MỘT nơi (một câu hoặc danh sách chưa gắn).
const clone = (st) => ({ questions: st.questions.map(q => ({ ...q, imageIds: [...q.imageIds] })), unresolved: st.unresolved.map(u => ({ ...u })) });
const detach = (st, id) => { st.questions.forEach(q => { q.imageIds = q.imageIds.filter(x => x !== id); }); st.unresolved = st.unresolved.filter(u => u.id !== id); };

export const buildState = (parsed) => clone({ questions: parsed.questions, unresolved: parsed.unresolved });
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
export const finalizeQuestions = (state, dataOf) => state.questions.map(q => {
    const images = q.imageIds.map(dataOf).filter(Boolean);
    return { id: q.id, q: q.q, o: q.o, c: q.c, type: q.type, img: images[0] || null, images };
});

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
