import { sanitizeAiMathText } from '../../lib/helpers.js';

// 🆕 Chuyển JSON câu hỏi (do AI trả về) thành các dòng văn bản theo đúng định dạng
// "Câu.../A.../Đáp án:" mà parseRawQuizText() hiểu — dùng chung cho cả quét ảnh (OCR)
// VÀ phân tích Ngọc Giản (.txt/.docx), tránh lặp code 2 nơi.
export const quizJsonToLines = (questions) => {
    const lines = [];
    questions.forEach((qq, i) => {
        lines.push(`Câu ${i + 1}: ${sanitizeAiMathText(qq.q)}`);
        if (qq.type === 'numeric') {
            lines.push(`Đáp án: ${qq.c}`);
        } else {
            (qq.o || []).forEach((opt, oi) => lines.push(`${String.fromCharCode(65 + oi)}. ${sanitizeAiMathText(opt)}`));
            if (qq.type === 'multi' && Array.isArray(qq.c)) {
                lines.push(`Đáp án: ${qq.c.map(idx => String.fromCharCode(65 + idx)).join(',')}`);
            } else {
                lines.push(`Đáp án: ${String.fromCharCode(65 + (qq.c || 0))}`);
            }
        }
    });
    return lines;
};

// 🆕 Bóc JSON ra khỏi phản hồi thô của Gemini (lỡ có kèm ```json hay chữ thừa)
export const parseAiQuizJson = (rawResp) => {
    let raw = (rawResp || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
    if (s !== -1 && en !== -1) raw = raw.substring(s, en + 1);
    return JSON.parse(raw);
};
