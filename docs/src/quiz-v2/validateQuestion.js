// QUIZ ENGINE V2 – Kiểm tra 1 câu ở dạng ĐÃ LƯU (dùng cho preview DOCX, editor và kiểm tra trước khi lưu). THUẦN HÀM.
import { normalizeType, parseNumber, shortAnswerType, SECTION_BY_ID } from './questionTypes.js';
import { acceptedList } from './shortAnswer.js';
const L = (i) => String.fromCharCode(65 + i);

// Trả danh sách lỗi (rỗng = hợp lệ). `prefix` ví dụ "Câu 4: ".
export const validateQuestionV2 = (q, prefix = '') => {
    const e = []; const p = prefix;
    if (!q || typeof q !== 'object') return [p + 'dữ liệu câu hỏi không hợp lệ.'];
    if (!String(q.q || '').trim()) e.push(p + 'nội dung trống.');
    if (q.type === 'unknown') { e.push(p + 'chưa xác định loại câu' + (q.parseReason ? ` (${q.parseReason})` : '') + '.'); return e; }
    const known = ['single', 'truefalse', 'short', 'essay', 'multi', 'numeric'];
    if (!known.includes(q.type)) { e.push(p + `loại câu "${q.type}" không tương thích Quiz Engine.`); return e; }
    if (q.sectionId && !SECTION_BY_ID[q.sectionId]) e.push(p + `phần "${q.sectionId}" không hợp lệ.`);
    const t = normalizeType(q.type); const o = Array.isArray(q.o) ? q.o : [];
    if (t === 'single') {
        if (o.length < 2) e.push(p + 'cần ít nhất 2 lựa chọn.');
        o.forEach((x, k) => { if (!String(x || '').trim()) e.push(p + `lựa chọn ${L(k)} trống.`); });
        if (!Number.isInteger(q.c)) e.push(p + 'thiếu đáp án đúng.');
        else if (q.c < 0 || q.c >= o.length) e.push(p + `đáp án ${L(q.c)} vượt số lựa chọn.`);
    } else if (t === 'truefalse') {
        if (o.length < 2) e.push(p + 'cần ít nhất 2 ý.');
        o.forEach((x, k) => { if (!String(x || '').trim()) e.push(p + `ý ${L(k)} trống.`); });
        if (!Array.isArray(q.c) || q.c.some(x => !Number.isInteger(x) || x < 0 || x >= o.length)) e.push(p + 'dữ liệu Đúng/Sai không hợp lệ.');
    } else if (t === 'short') {
        if (shortAnswerType(q) === 'number') {
            if (Number.isNaN(parseNumber(q.c))) e.push(p + 'thiếu hoặc sai đáp án số.');
            if (q.tolerance != null && !(typeof q.tolerance === 'number' && q.tolerance >= 0)) e.push(p + 'sai số (tolerance) không hợp lệ.');
        } else if (!acceptedList(q).length) e.push(p + 'thiếu đáp án (cần ít nhất 1 đáp án được chấp nhận).');
    } else if (t === 'essay') {
        if (q.maxScore != null && !(typeof q.maxScore === 'number' && q.maxScore > 0)) e.push(p + 'điểm tối đa phải là số lớn hơn 0.');
        if (q.rubric != null && !(Array.isArray(q.rubric) || typeof q.rubric === 'string')) e.push(p + 'rubric không hợp lệ.');
    }
    return e;
};

// Bản sạch để đưa sang lớp lưu trữ (Storage V2 sau này): bỏ trường tạm chỉ dùng cho UI, giữ nguyên q/o/c/type/ảnh.
const KEEP = ['id', 'index', 'q', 'o', 'c', 'type', 'img', 'images', 'e', 'sectionId', 'answerType', 'tolerance', 'acceptedAnswers', 'caseSensitive', 'rubric', 'maxScore', 'sampleAnswer', 'points', 'subject', 'topic', 'difficulty', 'parseConfidence', 'requiresReview'];
export const cleanQuestionForSave = (q) => {
    const out = {}; KEEP.forEach(k => { if (q[k] !== undefined && q[k] !== null) out[k] = q[k]; });
    if (out.img === undefined && q.img === null) out.img = null;
    // Không lưu Object URL blob: (mất sau khi tải lại trang) và không lưu trùng base64 ở img + images[0]
    const isBlob = (s) => typeof s === 'string' && s.startsWith('blob:');
    if (isBlob(out.img)) out.img = null;
    if (Array.isArray(out.images)) out.images = out.images.filter(x => x && !isBlob(x));
    return out;
};

// Toàn bộ chữ người dùng nhập của 1 câu (dùng cho kiểm duyệt nội dung): đề, lựa chọn, đáp án chữ, rubric, bài mẫu.
export const collectQuestionText = (q) => {
    if (!q) return '';
    const parts = [q.q, ...(Array.isArray(q.o) ? q.o : [])];
    if (typeof q.c === 'string' && q.type === 'short') parts.push(q.c);
    if (Array.isArray(q.acceptedAnswers)) parts.push(...q.acceptedAnswers);
    if (typeof q.rubric === 'string') parts.push(q.rubric); else if (Array.isArray(q.rubric)) q.rubric.forEach(r => parts.push(typeof r === 'string' ? r : (r && r.text)));
    if (q.sampleAnswer) parts.push(q.sampleAnswer);
    return parts.filter(x => typeof x === 'string' && x).join(' ');
};
