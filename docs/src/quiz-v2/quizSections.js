// QUIZ ENGINE V2 – Cấu trúc sections + lớp tương thích với data[] phẳng. THUẦN HÀM.
// Bí Tịch cũ: { data: [...] }              -> chạy như trước (không sectionId, KHÔNG đổi thứ tự xáo trộn cũ).
// Bí Tịch mới: câu mang `sectionId` (data vẫn phẳng, không nhân đôi dữ liệu) và/hoặc có dạng { sections:[{id,title,type,questions}] }.
import { SECTION_DEFS, SECTION_BY_ID, normalizeType, sectionOf, sectionIdForType, V2_TYPES } from './questionTypes.js';

// Danh sách câu phẳng từ: mảng câu | { data } | { sections:[{questions}] } | { d } (mã chia sẻ)
export const flattenQuiz = (quizLike) => {
    if (Array.isArray(quizLike)) return quizLike;
    if (!quizLike || typeof quizLike !== 'object') return [];
    if (Array.isArray(quizLike.sections) && quizLike.sections.some(s => s && Array.isArray(s.questions))) {
        const out = [];
        quizLike.sections.forEach(s => { (s.questions || []).forEach(q => out.push(q && q.sectionId ? q : { ...q, sectionId: (s.id && SECTION_BY_ID[s.id]) ? s.id : sectionIdForType(q && q.type || s.type) })); });
        return out;
    }
    if (Array.isArray(quizLike.data)) return quizLike.data;
    if (Array.isArray(quizLike.d)) return quizLike.d;
    return [];
};

// Có dấu hiệu V2 không? (loại câu mới hoặc có sectionId). Bí Tịch cũ thuần single/multi/numeric không sectionId -> false.
export const quizHasV2 = (data) => (Array.isArray(data) ? data : flattenQuiz(data)).some(q => q && (V2_TYPES.slice(1).includes(q.type) || q.sectionId));

// Dựng cấu trúc sections theo đúng spec từ data phẳng (đúng thứ tự PHẦN I -> IV, bỏ phần rỗng). Không đổi câu gốc.
export const getQuizSections = (quizLike) => {
    const flat = flattenQuiz(quizLike);
    const bucket = {}; SECTION_DEFS.forEach(s => { bucket[s.id] = []; });
    flat.forEach(q => { if (q) bucket[sectionOf(q)].push(q); });
    return SECTION_DEFS.filter(s => bucket[s.id].length).map(s => ({ id: s.id, title: s.title, type: s.type, questions: bucket[s.id] }));
};

// Thứ tự làm bài. Bí Tịch cũ (không dấu hiệu V2): ĐÚNG như cũ -> shuffle(data). Bí Tịch V2: giữ thứ tự PHẦN I->IV, chỉ xáo trong từng phần.
export const orderForRun = (data, shuffle) => {
    const flat = flattenQuiz(data);
    if (!quizHasV2(flat)) return shuffle(flat);
    const out = []; getQuizSections(flat).forEach(s => { shuffle(s.questions).forEach(q => out.push(q)); });
    return out;
};

// Đánh lại index 1..n theo thứ tự hiện tại (không đổi nội dung / đáp án / ảnh)
export const renumber = (list) => (list || []).map((q, i) => ({ ...q, index: i + 1 }));

// Sắp xếp danh sách phẳng theo PHẦN I->IV (giữ thứ tự tương đối trong phần), dùng khi lưu từ preview
export const sortBySection = (list) => {
    const rank = Object.fromEntries(SECTION_DEFS.map((s, i) => [s.id, i]));
    return (list || []).map((q, i) => ({ q, i })).sort((a, b) => (rank[sectionOf(a.q)] - rank[sectionOf(b.q)]) || (a.i - b.i)).map(x => x.q);
};
export { normalizeType };
