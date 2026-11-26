import { auth } from '../../config/firebase.js';

// Dịch mã lỗi Firebase Auth sang tiếng Việt dễ hiểu thay vì hiện nguyên câu tiếng Anh khó hiểu.
// Email thật = email đăng nhập của tài khoản khi KHÔNG phải email giả nội bộ. KHÔNG lưu vào Firestore (hồ sơ người dùng ai đăng nhập cũng đọc được).
export const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export const realEmailOf = (fb) => { const e = (fb && fb.email) || ''; return e && !e.toLowerCase().endsWith('@thienkieu.com') ? e : ''; };

export const translateAuthError = (e) => {
    const code = e?.code || '';
    if (code === 'auth/email-already-in-use') return 'Đạo hiệu này đã có người lập trước rồi! Hãy đổi Đạo hiệu khác hoặc thử Đăng nhập nếu đây chính là tài khoản của Ngài.';
    if (code === 'auth/weak-password') return 'Mật mã quá yếu! Cần ít nhất 6 ký tự.';
    if (code === 'auth/invalid-email') return 'Đạo hiệu không hợp lệ! Chỉ được dùng chữ cái không dấu (a-z) và số, không khoảng trắng, không ký tự đặc biệt.';
    if (code === 'auth/invalid-login-credentials' || code === 'auth/invalid-credential') return 'Đạo hiệu hoặc Mật mã không hợp lệ!';
    if (code === 'auth/operation-not-allowed') return 'Đăng nhập bằng Đạo hiệu/Mật mã hiện đang bị khoá phía máy chủ! Hãy báo cho quản trị viên bật lại mục "Email/Password" trong Firebase Authentication.';
    if (code === 'auth/network-request-failed') return 'Lỗi kết nối mạng! Kiểm tra lại đường truyền.';
    if (code === 'auth/too-many-requests') return 'Thử quá nhiều lần! Xin chờ ít phút rồi thử lại.';
    return 'Lỗi: ' + (e?.message || 'Không rõ nguyên nhân');
};

// Chuyển Đạo Hiệu (có thể chứa tiếng Việt có dấu, khoảng trắng...) thành chuỗi thuần
// a-z0-9 an toàn để ghép vào email giả (fakeEmail) gửi lên Firebase Auth. TRƯỚC ĐÂY thiếu bước
// này -> Đạo hiệu có dấu/khoảng trắng (VD: "Tiểu Long") sẽ tạo ra email không hợp lệ
// (VD: "tiểu long@thienkieu.com") khiến Firebase luôn trả lỗi auth/invalid-email và
// KHÔNG THỂ tạo tài khoản mới bằng Mật Mã, dù giao diện không báo rõ nguyên nhân thật sự.
export const slugifyName = (raw) => raw
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // chỉ giữ lại chữ không dấu và số

export const isGoogleLinked = (auth.currentUser?.providerData || []).some(p => p.providerId === 'google.com');
