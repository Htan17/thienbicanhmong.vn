import { DOCX_IMPORT_CONFIG as CFG } from './docxImportTypes.js';
import { base64Bytes } from './docxImageExtractor.js';

export const dataUriBytes = (uri) => { const i = String(uri || '').indexOf(','); return i < 0 ? 0 : base64Bytes(uri.slice(i + 1)); };

// Nén 1 ảnh (chỉ chạy trong trình duyệt). Ảnh GỐC không bị sửa/xoá - hàm trả về bản mới để người dùng xem trước.
// Không cắt ảnh, chỉ thu nhỏ khi cạnh dài > maxDim. Ảnh nền trong suốt được trải lên nền trắng (tránh nền đen khi ra JPEG).
export const compressDataUri = (dataUri, cfg = CFG.compress) => new Promise((resolve) => {
    const origBytes = dataUriBytes(dataUri);
    const keep = (reason) => resolve({ dataUri, bytes: origBytes, compressed: false, reason });
    try {
        const img = new Image();
        img.onerror = () => keep('Không nén được, giữ ảnh gốc.');
        img.onload = () => {
            try {
                let { width, height } = img; const m = cfg.maxDim;
                if (width > m || height > m) { if (width >= height) { height = Math.round(height * m / width); width = m; } else { width = Math.round(width * m / height); height = m; } }
                const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.fillStyle = cfg.flattenBackground; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
                let out = cfg.preferWebp ? canvas.toDataURL('image/webp', cfg.quality) : '';
                if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', cfg.quality);
                const bytes = dataUriBytes(out);
                if (cfg.keepOriginalIfSmaller && origBytes > 0 && bytes >= origBytes) return keep('Ảnh gốc đã nhỏ, giữ nguyên.');
                resolve({ dataUri: out, bytes, compressed: true, reason: '' });
            } catch (e) { keep('Không nén được, giữ ảnh gốc.'); }
        };
        img.src = dataUri;
    } catch (e) { keep('Không nén được, giữ ảnh gốc.'); }
});

// Kiểm tra giới hạn trước khi lưu. errors = CHẶN LƯU; warnings = chỉ cảnh báo.
// finalQuestions: kết quả finalizeQuestions; existingLibraryBytes: kích thước ước lượng của user.library hiện có.
export const checkLimits = (finalQuestions, existingLibraryBytes = 0) => {
    const L = CFG.limits; const errors = [], warnings = [];
    const imgs = finalQuestions.flatMap(q => q.images || []);
    const sizes = imgs.map(dataUriBytes); const total = sizes.reduce((a, b) => a + b, 0);
    if (imgs.length > L.maxImagesPerQuiz) errors.push(`Có ${imgs.length} ảnh, vượt giới hạn ${L.maxImagesPerQuiz} ảnh / Bí Tịch (bản thử nghiệm).`);
    if (total > L.maxTotalImageBytes) errors.push(`Tổng dung lượng ảnh ${Math.round(total / 1024)} KB vượt giới hạn ${Math.round(L.maxTotalImageBytes / 1024)} KB (bản thử nghiệm). Hãy bớt ảnh.`);
    const projected = existingLibraryBytes + L.storedCopies * JSON.stringify(finalQuestions).length;
    if (projected > L.docBudgetBytes) errors.push(`Dữ liệu dự kiến ${Math.round(projected / 1024)} KB vượt ngân sách ${Math.round(L.docBudgetBytes / 1024)} KB của hồ sơ (Firestore giới hạn 1 MiB). Cần xoá bớt Bí Tịch/ảnh, hoặc dùng Firebase Storage (chưa bật).`);
    sizes.forEach((s, i) => { if (s > L.maxImageBytes) warnings.push(`Ảnh thứ ${i + 1} sau nén còn ${Math.round(s / 1024)} KB, lớn hơn mức đề xuất ${Math.round(L.maxImageBytes / 1024)} KB.`); });
    return { errors, warnings, imageCount: imgs.length, totalImageBytes: total, projectedBytes: projected };
};
