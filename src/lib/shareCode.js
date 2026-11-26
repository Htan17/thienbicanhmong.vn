

// 📤 MÃ BÍ TỊCH VIDEO NGẮN GỌN (SỬA LỖI MÃ QUÁ DÀI): trước đây mã chia sẻ được nén cả link +
// tóm tắt + toàn bộ từ vựng bằng LZString thành 1 chuỗi rất dài (dễ tràn dòng/khó chép tay/khó
// đọc). Nay đổi cách làm: dữ liệu đầy đủ được lưu thẳng lên Tàng Kinh Các (Firestore, collection
// "videoShares"), còn "Mã Bí Tịch" đưa cho người khác chỉ còn là 1 con số NGẪU NHIÊN 12 CHỮ SỐ
// (dùng làm khoá tra cứu doc trên Firestore) - ngắn, dễ đọc, dễ chép tay, không còn tràn dòng.
export const SHARE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm: 0/O, 1/I/L

export const makeShortCode = (len = 8) => Array.from({ length: len }, () => SHARE_ALPHABET[Math.floor(Math.random() * SHARE_ALPHABET.length)]).join('');

export const isShortVideoCode = (code) => { const c = String(code || '').trim(); return /^\d{10,12}$/.test(c) || /^[A-Z2-9]{8}$/i.test(c); };
