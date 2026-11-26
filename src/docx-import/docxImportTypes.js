// DOCX IMAGE IMPORT (prototype) - cấu hình và hằng số. Mọi giới hạn nằm ở đây để hiệu chỉnh/ghi báo cáo.
export const DOCX_IMPORT_CONFIG = Object.freeze({
    supportedMime: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], // MIME thật được giữ nguyên, không mặc định PNG
    mimeAlias: { 'image/jpg': 'image/jpeg', 'image/pjpeg': 'image/jpeg', 'image/x-png': 'image/png' },
    warnOriginalImageBytes: 1500000, // ảnh gốc lớn hơn mức này -> cảnh báo "vượt kích thước đề xuất"
    compress: { maxDim: 1000, quality: 0.78, preferWebp: true, keepOriginalIfSmaller: true, flattenBackground: '#ffffff' },
    limits: {
        maxImageBytes: 200000,       // sau nén, mỗi ảnh nên <= 200 KB (cảnh báo)
        maxImagesPerQuiz: 8,         // prototype: tối đa 8 ảnh / Bí Tịch (chặn lưu)
        maxTotalImageBytes: 600000,  // prototype: tổng ảnh sau nén <= 600 KB (chặn lưu)
        docBudgetBytes: 900000,      // ngân sách ước lượng cho document người dùng (Firestore giới hạn 1 MiB)
        storedCopies: 2              // Bí Tịch được lưu 2 lần trong library: `data` và chuỗi nén `code` (tính thận trọng)
    },
    idPrefix: 'q_'
});

export const UNRESOLVED_REASON = Object.freeze({
    BEFORE_FIRST: 'Ảnh nằm trước câu hỏi đầu tiên.',
    ORPHAN: 'Ảnh nằm ở phần không nhận ra được câu hỏi.',
    DUPLICATE: 'Ảnh lặp lại nhiều lần (có thể là logo) nên không tự gắn.',
    UNREADABLE: 'Không đọc được ảnh này.',
    CROSSCHECK: 'Không chắc chắn vị trí ảnh nên không tự đoán.',
    REMOVED: 'Đã gỡ khỏi câu hỏi.'
});
