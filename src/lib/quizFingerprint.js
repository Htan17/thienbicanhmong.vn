// Dấu vân tay nội dung một lượt Quiz: không phụ thuộc thứ tự câu/đáp án (Quiz được xáo trộn mỗi lượt).
// Chỉ dùng để máy chủ PHÁT HIỆN cày một bộ câu hỏi lặp lại (cờ ghi nhật ký), KHÔNG dùng để chấm đúng/sai.
export const quizFingerprint = (questions) => {
    const texts = (Array.isArray(questions) ? questions : []).map(q => String((q && q.q) || '').replace(/\s+/g, ' ').trim().toLowerCase()).sort();
    let h = 0x811c9dc5; // FNV-1a 32-bit
    for (const t of texts) { for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } h ^= 0x7c; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36) + texts.length.toString(36);
};
