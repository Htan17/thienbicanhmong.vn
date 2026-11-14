// Rút gọn số lớn để không tràn thanh chỉ số: 999 giữ nguyên, 1.2k, 45k, 3.4m...
export const formatNumber = (num) => {
    const n = Number(num) || 0;
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs < 1000) return sign + abs.toString();
    if (abs < 1000000) return sign + (Math.floor(abs / 100) / 10).toString().replace(/\.0$/, '') + 'k';
    if (abs < 1000000000) return sign + (Math.floor(abs / 100000) / 10).toString().replace(/\.0$/, '') + 'm';
    return sign + (Math.floor(abs / 100000000) / 10).toString().replace(/\.0$/, '') + 'b';
};
// SỬA LỖI THÔNG BÁO DÀI NGOẰNG: lỗi API Gemini (đặc biệt lỗi hết quota) trả về nguyên đoạn văn
// dài hàng chục dòng (link tài liệu, danh sách chi tiết từng quota...). Rút gọn lại thành 1 câu
// ngắn, dễ hiểu bằng tiếng Việt, chỉ giữ nguyên câu gốc nếu nó vốn đã ngắn.
export const shortErr = (msg) => {
    const raw = String(msg || 'Không rõ nguyên nhân');
    if (/quota|429|resource.?exhausted/i.test(raw)) {
        return 'Hết lượt dùng miễn phí (Quota) cho API Key rồi! Hãy chờ vài phút rồi thử lại, hoặc thêm Key thứ 2 (từ dự án Google khác) ở mục Hồ Sơ để AI chạy song song.';
    }
    if (/api key not valid|invalid.?api.?key|permission.?denied|api_key_invalid/i.test(raw)) {
        return 'API Key Gemini không hợp lệ! Hãy kiểm tra lại Key đã dán đúng chưa.';
    }
    if (/no document to update|not-found/i.test(raw)) return 'Hồ sơ chưa được tạo trên máy chủ. Hãy tải lại trang (Ctrl+F5) rồi thử lại.';
    if (/missing or insufficient permissions|permission-denied/i.test(raw)) return 'Máy chủ từ chối ghi dữ liệu (kiểm tra Firestore Rules).';
    const oneLine = raw.replace(/\s+/g, ' ').trim();
    return oneLine.length > 140 ? oneLine.slice(0, 140) + '...' : oneLine;
};
