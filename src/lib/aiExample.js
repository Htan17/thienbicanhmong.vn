// VÍ DỤ DO AI TẠO: 1 câu tự nhiên dùng đúng từ của thẻ + nghĩa tiếng Việt của câu. Hàm thuần (không gọi mạng) để test được.
export const buildExamplePrompt = (card, langName) => {
    const w = String((card && card.original) || '').trim(), m = String((card && card.translated) || '').trim();
    const pos = card && card.partOfSpeech ? ` (loại từ: ${card.partOfSpeech})` : '';
    return `Bạn là giáo viên ngoại ngữ. Hãy viết ĐÚNG 1 câu ví dụ ngắn (tối đa 15 từ), tự nhiên, dễ hiểu, dùng nguyên văn từ "${w}"${pos} trong ${langName || 'ngôn ngữ của từ'}, với nghĩa "${m}". ` +
        `Câu phải chứa chính xác từ "${w}" (không biến thành từ khác). Trả về DUY NHẤT JSON một dòng, không giải thích, không markdown: {"s":"<câu ví dụ>","vi":"<dịch sang tiếng Việt>"}`;
};
// Tách JSON khỏi câu trả lời của AI (có thể kèm ```json ... ``` hoặc chữ thừa). Trả { s, vi } hoặc null nếu không dùng được.
export const parseExample = (text, word) => {
    let t = String(text || '').replace(/```json|```/gi, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b <= a) return null;
    let o; try { o = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
    const s = String((o && o.s) || '').replace(/\s+/g, ' ').trim().slice(0, 240), vi = String((o && o.vi) || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!s || s.length < 3) return null;
    // Câu phải thực sự chứa từ cần học (không phân biệt hoa/thường) - nếu không, chế độ "Điền câu" sẽ không khuyết được từ.
    if (word && !s.toLowerCase().includes(String(word).toLowerCase().trim())) return null;
    return { s, vi };
};
