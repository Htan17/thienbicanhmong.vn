// 🈶 SỬA LỖI TRA TỪ CHỮ TƯỢNG HÌNH: tiếng Trung/Nhật không có khoảng trắng giữa các từ, nên
// trước đây tách theo \s+ khiến CẢ CÂU dính thành 1 khối bấm được duy nhất (bấm đâu cũng tra
// nguyên câu). Giờ phát hiện có ký tự Hán (CJK) trong câu thì dùng Intl.Segmenter (API chuẩn của
// trình duyệt, có sẵn ICU tách từ tiếng Trung/Nhật rất tốt, KHÔNG cần tải thư viện ngoài) để tách
// đúng từng "từ/cụm từ đi cùng nhau" (VD: 非常 / 喜欢 tách riêng thay vì dính nguyên câu).
// Nếu trình duyệt cũ không hỗ trợ Intl.Segmenter thì fallback về tách từng CHỮ HÁN riêng lẻ
// (vẫn tra được, chỉ là tách nhỏ hơn 1 chút, không bị lỗi dính cả câu như trước).
export const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
export const KANA_RE = /[\u3040-\u30ff]/;
// 🇰🇷 Hangul (tiếng Hàn): dùng Intl.Segmenter locale 'ko' để tách đúng từ/âm tiết đi cùng nhau
// (chữ Hàn tuy có khoảng trắng nhưng thường là theo CỤM TỪ chứ không phải từng từ đơn lẻ).
export const HANGUL_RE = /[\uac00-\ud7af]/;
export const segmentCjkText = (text) => {
    const locale = HANGUL_RE.test(text) ? 'ko' : (KANA_RE.test(text) ? 'ja' : 'zh');
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const seg = new Intl.Segmenter(locale, { granularity: 'word' });
            return Array.from(seg.segment(text), s => s.segment);
        } catch (e) { /* rơi xuống fallback bên dưới */ }
    }
    return Array.from(text); // fallback: tách theo từng chữ (Array.from tôn trọng ký tự Unicode)
};
