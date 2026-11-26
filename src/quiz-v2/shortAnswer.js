// QUIZ ENGINE V2 – Chấm câu TRẢ LỜI NGẮN (type='short'). THUẦN HÀM.
//  answerType 'number': hỗ trợ số âm, số thập phân (dấu . hoặc ,), sai số `tolerance` (mặc định 0.01 – đúng như điền số cũ).
//  answerType 'text'  : so khớp CHÍNH XÁC với c hoặc một mục trong acceptedAnswers[] sau khi chuẩn hoá (Unicode NFC, bỏ khoảng trắng thừa,
//                        tùy chọn không phân biệt hoa/thường). KHÔNG so khớp mờ (không bỏ dấu tiếng Việt, không "gần giống"):
//                        "Hà Nội" khác "Ha Noi" trừ khi người soạn đề tự thêm "Ha Noi" vào acceptedAnswers.
import { parseNumber, shortAnswerType, SHORT_DEFAULT_TOLERANCE } from './questionTypes.js';

// Chuẩn hoá văn bản để so khớp. Chỉ những phép biến đổi an toàn (không đổi nghĩa).
export const normalizeAnswerText = (s, { caseSensitive = false } = {}) => {
    let t = String(s == null ? '' : s).normalize('NFC');
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    return caseSensitive ? t : t.toLocaleLowerCase('vi');
};

export const acceptedList = (q) => {
    const list = [];
    if (q && q.c != null && String(q.c).trim() !== '') list.push(String(q.c));
    if (q && Array.isArray(q.acceptedAnswers)) q.acceptedAnswers.forEach(a => { if (a != null && String(a).trim() !== '') list.push(String(a)); });
    return list;
};

// Trả { correct:boolean, reason:string }
export const gradeShortAnswer = (q, input) => {
    const raw = String(input == null ? '' : input);
    if (!raw.trim()) return { correct: false, reason: 'empty' };
    if (shortAnswerType(q) === 'number') {
        const user = parseNumber(raw);
        const goal = parseNumber(q.c);
        if (!Number.isNaN(user) && !Number.isNaN(goal)) {
            const tol = typeof q.tolerance === 'number' && q.tolerance >= 0 ? q.tolerance : SHORT_DEFAULT_TOLERANCE;
            const diff = Math.abs(user - goal);
            return { correct: tol > 0 ? diff < tol : diff === 0, reason: 'number' };
        }
        // Đáp án chuẩn không phải số (dữ liệu cũ lạ): so chuỗi như Quiz Engine cũ
        return { correct: raw.trim().toLowerCase() === String(q.c == null ? '' : q.c).trim().toLowerCase(), reason: 'legacy-string' };
    }
    const cs = q.caseSensitive === true;
    const u = normalizeAnswerText(raw, { caseSensitive: cs });
    const ok = acceptedList(q).some(a => normalizeAnswerText(a, { caseSensitive: cs }) === u);
    return { correct: ok, reason: 'text' };
};

// Mô tả đáp án đúng để hiển thị sau khi nộp
export const describeShortAnswer = (q) => {
    if (shortAnswerType(q) === 'number') return String(q.c);
    const list = acceptedList(q);
    return list.length > 1 ? `${list[0]} (chấp nhận: ${list.slice(1).join('; ')})` : (list[0] || '');
};
