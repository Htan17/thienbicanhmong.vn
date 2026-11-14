// QUIZ ENGINE V2 – Loại câu hỏi, section và lớp TƯƠNG THÍCH với dữ liệu cũ. THUẦN HÀM: không gọi AI, không chạm Firestore, không đổi dữ liệu truyền vào.
//
// 4 loại câu V2:  single (PHẦN I) | truefalse (PHẦN II) | short (PHẦN III) | essay (PHẦN IV)
// Tương thích dữ liệu cũ (Bí Tịch đã lưu KHÔNG bị migrate, vẫn chạy 100%):
//   'multi'   = Đúng/Sai nhiều ý kiểu cũ  -> đọc như 'truefalse' (cùng cấu trúc: c = mảng chỉ số các ý ĐÚNG)
//   'numeric' = Điền số kiểu cũ          -> đọc như 'short' + answerType 'number'
// Tên 'multi' dễ nhầm với "chọn nhiều đáp án" nên DỮ LIỆU MỚI không dùng tên đó nữa.

export const V2_TYPES = Object.freeze(['single', 'truefalse', 'short', 'essay']);
export const LEGACY_ALIAS = Object.freeze({ multi: 'truefalse', numeric: 'short' });

export const SECTION_DEFS = Object.freeze([
    Object.freeze({ id: 'multiple_choice', title: 'PHẦN I. TRẮC NGHIỆM', shortTitle: 'Phần I', roman: 'I', label: 'Trắc nghiệm', type: 'single' }),
    Object.freeze({ id: 'true_false', title: 'PHẦN II. ĐÚNG / SAI', shortTitle: 'Phần II', roman: 'II', label: 'Đúng/Sai', type: 'truefalse' }),
    Object.freeze({ id: 'short_answer', title: 'PHẦN III. TRẢ LỜI NGẮN', shortTitle: 'Phần III', roman: 'III', label: 'Trả lời ngắn', type: 'short' }),
    Object.freeze({ id: 'essay', title: 'PHẦN IV. TỰ LUẬN', shortTitle: 'Phần IV', roman: 'IV', label: 'Tự luận', type: 'essay' })
]);
export const SECTION_BY_ID = Object.freeze(Object.fromEntries(SECTION_DEFS.map(s => [s.id, s])));
export const SECTION_BY_TYPE = Object.freeze(Object.fromEntries(SECTION_DEFS.map(s => [s.type, s])));

// Tên loại ở dạng V2 (multi -> truefalse, numeric -> short). Loại lạ/thiếu -> 'single' (đúng như Quiz Engine cũ: !type = single).
export const normalizeType = (t) => {
    if (V2_TYPES.includes(t)) return t;
    if (LEGACY_ALIAS[t]) return LEGACY_ALIAS[t];
    return 'single';
};
export const isTrueFalseType = (t) => t === 'truefalse' || t === 'multi';
export const isShortType = (t) => t === 'short' || t === 'numeric';
export const isEssayType = (t) => t === 'essay';
export const isSingleType = (t) => !t || t === 'single';
export const isLegacyType = (t) => t === 'multi' || t === 'numeric';
// Loại có chấm đúng/sai khách quan (essay thì không)
export const isObjectiveType = (t) => !isEssayType(t);

export const sectionIdForType = (t) => SECTION_BY_TYPE[normalizeType(t)].id;
export const sectionOf = (q) => {
    if (q && q.sectionId && SECTION_BY_ID[q.sectionId]) return q.sectionId;
    return sectionIdForType(q && q.type);
};

// Số thật trong chuỗi đáp án: cho phép số âm, thập phân, dấu phẩy thập phân (giống Quiz Engine cũ).
export const NUM_RE = /^-?\d+(?:[.,]\d+)?$/;
export const parseNumber = (v) => {
    const s = String(v == null ? '' : v).trim().replace(/\s+/g, '').replace(',', '.');
    if (!/^-?\d+(?:\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
};

// answerType của câu short (numeric cũ = number). Câu short thiếu answerType: đoán an toàn theo c (số -> number, còn lại -> text).
export const shortAnswerType = (q) => {
    if (!q) return 'number';
    if (q.type === 'numeric') return 'number';
    if (q.answerType === 'number' || q.answerType === 'text') return q.answerType;
    return Number.isNaN(parseNumber(q.c)) ? 'text' : 'number';
};

// Bản "nhìn" V2 của một câu (KHÔNG sửa câu gốc, KHÔNG làm mất img/images/e/…): dùng cho phân tích, thống kê, hiển thị nhãn.
// Câu gốc vẫn giữ nguyên type cũ để mọi nhánh Quiz Engine cũ chạy như trước.
export const normalizeQuestionRuntime = (q) => {
    if (!q || typeof q !== 'object') return q;
    const type = normalizeType(q.type);
    const out = { ...q, type, sectionId: sectionOf({ ...q, type }) };
    if (isLegacyType(q.type)) out.legacyType = q.type;
    if (type === 'short') {
        out.answerType = shortAnswerType(q);
        if (out.answerType === 'number' && out.tolerance == null) out.tolerance = SHORT_DEFAULT_TOLERANCE;
    }
    if (type === 'essay') { out.o = Array.isArray(q.o) ? q.o : []; }
    return out;
};
export const SHORT_DEFAULT_TOLERANCE = 0.01; // y hệt Quiz Engine cũ: |a - b| < 0.01

export const TYPE_LABEL_V2 = Object.freeze({ single: '1 đáp án', truefalse: 'Đúng/Sai nhiều ý', short: 'Trả lời ngắn', essay: 'Tự luận', multi: 'Đúng/Sai nhiều ý', numeric: 'Điền số', unknown: '⚠️ Chưa xác định' });
