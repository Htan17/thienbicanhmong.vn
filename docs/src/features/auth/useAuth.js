import { auth, firestore } from '../../config/firebase.js';
import { deleteAccount } from '../../lib/serverApi.js';
import { generateGameId } from '../../lib/userData.js';
import { isPublicTextBlocked, isReservedName } from '../../lib/contentFilter.js';
import { shortErr } from '../../lib/format.js';
import { looksLikeEmail, translateAuthError, slugifyName, realEmailOf } from './authHelpers.js';

const { useState } = React;

export function useAuth({ core, audio }) {
    const { allUsers } = core;
    const { playBgm, playSfx } = audio;
    const [pwdModal, setPwdModal] = useState({ show: false, val: '', oldVal: '' });
    // 🔥 KHÔI PHỤC CHUỖI ĐIỂM DANH: nếu bỏ lỡ quá 24h (không chơi hôm qua), thay vì âm thầm reset
    // về 1 như trước, hiện 3 lựa chọn: Học để khôi phục / Dùng Linh Thạch / Dùng Danh Vọng (Sao).
    const [agreeTerms, setAgreeTerms] = useState(false);
    // Auth State
    const [authMode, setAuthMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    // ✉️ EMAIL KHÔI PHỤC MẬT MÃ: đăng ký bằng Đạo Hiệu dùng email giả nội bộ nên không tự khôi
    // phục được. Cho phép liên kết thêm 1 email thật để gửi LIÊN KẾT khôi phục khi quên mật mã.
    const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
    // Xoá tài khoản vĩnh viễn: xác nhận 2 lớp (hộp thoại + gõ chính xác "XOA"); máy chủ xoá hồ sơ, dữ liệu con, tên đăng nhập và tài khoản Auth.
    const handleDeleteAccount = async () => {
        if (!await askConfirm("XOÁ VĨNH VIỄN tài khoản? Toàn bộ hồ sơ, Linh Thạch, vật phẩm, Bí Tịch sẽ mất và KHÔNG THỂ khôi phục.")) return;
        const typed = window.prompt('Gõ XOA (viết hoa) để xác nhận xoá tài khoản:');
        if (typed !== 'XOA') return alert('Đã huỷ: chưa gõ đúng XOA.');
        try { await deleteAccount(); } catch (e) { playSfx('ERROR'); return alert('Xoá tài khoản thất bại: ' + shortErr((e && e.message) || String(e))); }
        try { await auth.signOut(); } catch (e) { /* tài khoản Auth đã bị xoá, bỏ qua */ }
        alert('Đã xoá tài khoản.');
    };
    const handleLogout = async () => { if (await askConfirm("Tông chủ muốn rời khỏi Bí Cảnh sao?")) { playSfx('FAIL'); await auth.signOut(); } };
    const handleGoogleLogin = async () => {
        playSfx('CLICK');
        if (window.location.protocol === 'file:') return alert("Thiên Đạo cấm dùng Google Login khi chạy file offline! Hãy dùng App tạo Localhost!");
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            // Đã gỡ bỏ setCustomParameters khóa chết email để tu sĩ nào cũng vào được
            // Dùng Popup sẽ tránh bị tải lại trang gây lag Bí Cảnh
            await auth.signInWithPopup(provider);
        } catch(e) {
            alert("Lỗi kết nối Mạng Xã Hội: " + e.message);
        }
    };
    const handleEmailAuth = async () => {
        playSfx('CLICK');
        // Tài khoản đã gắn email thật (đã xác minh): đăng nhập bằng chính email đó + Mật Mã.
        if (authMode === 'login' && looksLikeEmail(username)) {
            if (!password) return alert("Xin hãy nhập đủ thông tin!");
            try { await auth.signInWithEmailAndPassword(username.trim(), password); playBgm(); } catch (e) { alert(translateAuthError(e)); }
            return;
        }
        const cleanName = slugifyName(username);
        if (!cleanName || !password) return alert("Xin hãy nhập đủ thông tin!");
        if (cleanName.length < 3) return alert("Đạo hiệu cần ít nhất 3 ký tự chữ/số (không dấu, không khoảng trắng)!");
        if (authMode === 'register' && (isReservedName(cleanName) || isPublicTextBlocked(cleanName))) return alert("Đạo hiệu này không được phép sử dụng (từ ngữ không phù hợp hoặc trùng tên dành riêng của quản trị). Vui lòng chọn tên khác!");
        const fakeEmail = `${cleanName}@thienkieu.com`; 
        if (authMode === 'register') {
            if (!agreeTerms) return alert("Vui lòng tick đồng ý Điều Khoản Dịch Vụ & Chính Sách Bảo Mật để tạo tài khoản.");
            if (allUsers.find(x => x.name === cleanName)) return alert("Đạo hiệu này đã tồn tại trên giang hồ!");
            try {
                const res = await auth.createUserWithEmailAndPassword(fakeEmail, password);
                await firestore.collection('users').doc(res.user.uid).set({
                    name: cleanName, spirit: 500, fame: 100, seasonScore: 0, streakCount: 0, lastPlayedDate: '', 
                    library: [], inventory: [], friends: [], requests: [], guild: null, gameId: generateGameId(), lastActive: Date.now(), 
                    photo: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${cleanName}`, rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
                });
                alert("Lập phái thành công! Ngài được tặng 500💎 & 100⭐ làm quà Tân Thủ. Hãy Đăng nhập lại để vào Bí Cảnh."); setAuthMode('login'); setPassword('');
            } catch(e) {
                // TỰ KHÔI PHỤC: nếu Đạo hiệu báo "đã tồn tại" nhưng thật ra là do lần tạo trước bị
                // gãy giữa chừng (tạo được tài khoản Auth nhưng chưa kịp lưu hồ sơ Firestore), thử
                // đăng nhập luôn bằng đúng mật mã vừa nhập - nếu đúng là của Ngài thì phục hồi hồ sơ,
                // nếu sai mật mã (tức là người khác đã lập Đạo hiệu này) thì mới báo lỗi thật.
                if (e.code === 'auth/email-already-in-use') {
                    try {
                        const res2 = await auth.signInWithEmailAndPassword(fakeEmail, password);
                        const existingDoc = await firestore.collection('users').doc(res2.user.uid).get();
                        if (!existingDoc.exists) {
                            await firestore.collection('users').doc(res2.user.uid).set({
                                name: cleanName, spirit: 500, fame: 100, seasonScore: 0, streakCount: 0, lastPlayedDate: '',
                                library: [], inventory: [], friends: [], requests: [], guild: null, gameId: generateGameId(), lastActive: Date.now(),
                                photo: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${cleanName}`, rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
                            });
                            alert("Đã tìm thấy và khôi phục lại hồ sơ dở dang trước đó của Ngài! Hãy Đăng nhập lại."); setAuthMode('login'); setPassword('');
                        } else {
                            alert("Đạo hiệu này của chính Ngài rồi, chỉ cần Đăng nhập là vào được!"); setAuthMode('login'); setPassword('');
                        }
                        await auth.signOut();
                        return;
                    } catch (e2) { /* sai mật mã -> đúng là người khác đã dùng tên này, rơi xuống báo lỗi bên dưới */ }
                }
                alert(translateAuthError(e));
            }
        } else {
            try { await auth.signInWithEmailAndPassword(fakeEmail, password); playBgm(); } catch(e) { alert(translateAuthError(e)); }
        }
    };
    // ĐỔI MẬT MÃ - SỬA LỖI: bản cũ chỉ có ô Mật Mã Mới nên hay dính lỗi "auth/requires-recent-login"
    // (Firebase yêu cầu xác thực lại gần đây trước khi đổi mật mã nhạy cảm). Nay bắt buộc nhập Mật Mã
    // CŨ để tự XÁC THỰC LẠI (reauthenticate) ngay tại chỗ trước khi đổi, tránh lỗi trên hoàn toàn -
    // trừ tài khoản chỉ đăng nhập bằng Google (không có mật mã cũ) thì bỏ qua bước này.
    const confirmChangePassword = async () => {
        playSfx('CLICK');
        const newPass = pwdModal.val;
        const oldPass = pwdModal.oldVal;
        if (newPass.length < 6) return alert("Mật mã quá ngắn, thiên đạo không cho phép! (Cần ít nhất 6 ký tự)");
        const fbUser = auth.currentUser;
        if (!fbUser) return alert("Không tìm thấy nguyên thần (User không tồn tại)!");
        const hasPasswordProvider = (fbUser.providerData || []).some(p => p.providerId === 'password');
        try {
            if (hasPasswordProvider) {
                if (!oldPass) return alert("Xin nhập Mật Mã CŨ để xác thực trước khi đổi!");
                const cred = firebase.auth.EmailAuthProvider.credential(fbUser.email, oldPass);
                try { await fbUser.reauthenticateWithCredential(cred); }
                catch (e2) { return alert(e2.code === 'auth/wrong-password' || e2.code === 'auth/invalid-credential' ? "Mật Mã CŨ không đúng!" : "Xác thực thất bại: " + shortErr(e2.message)); }
            }
            await fbUser.updatePassword(newPass);
            playSfx('SUCCESS'); alert("Đổi Mật Mã thành công! Khí tức đã được che giấu an toàn."); setPwdModal({ show: false, val: '', oldVal: '' });
        } catch(e) {
            if (e.code === 'auth/requires-recent-login') { alert("Ngài đã bế quan quá lâu! Xin hãy đăng xuất và đăng nhập lại trước khi đổi mật mã."); setPwdModal({ show: false, val: '', oldVal: '' }); } 
            else { alert("Lỗi đổi mật mã: " + shortErr(e.message)); }
        }
    };
    // Quên Mật Khẩu ngay trong Hồ Sơ (đã đăng nhập, có sẵn Email Khôi Phục đã lưu).
    const forgotPasswordFromProfile = async () => {
        playSfx('CLICK');
        const rEmail = realEmailOf(auth.currentUser);
        if (!rEmail) return alert("Ngài chưa gắn Email Khôi Phục đã xác minh! Hãy thêm Email Khôi Phục ở bên dưới trước.");
        try {
            await auth.sendPasswordResetEmail(rEmail);
            alert(`Đã gửi Liên Kết đổi Mật Mã tới ${rEmail}! Hãy kiểm tra hộp thư.`);
            setPwdModal({ show: false, val: '', oldVal: '' });
        } catch (e) { alert("Gửi email thất bại: " + shortErr(e.message)); }
    };
    // 🔗 LIÊN KẾT TÀI KHOẢN GOOGLE: tài khoản tạo bằng Đạo Hiệu/Mật Mã dùng email giả nội bộ
    // (...@thienkieu.com) nên KHÔNG THỂ lấy lại mật mã qua email nếu quên. Liên kết thêm Google
    // vào chính tài khoản hiện tại (linkWithPopup, không tạo tài khoản mới) để có đường lui: sau
    // này chỉ cần bấm "Đăng nhập Google" là vào lại đúng nhân vật cũ, không sợ mất tài khoản.
    const handleLinkGoogleAccount = async () => {
        playSfx('CLICK');
        if (window.location.protocol === 'file:') return alert("Thiên Đạo cấm dùng Google Login khi chạy file offline! Hãy dùng App tạo Localhost!");
        const fbUser = auth.currentUser;
        if (!fbUser) return alert("Không tìm thấy nguyên thần (User không tồn tại)!");
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await fbUser.linkWithPopup(provider);
            playSfx('SUCCESS');
            alert("Liên kết Google thành công! Từ nay Ngài có thể đăng nhập lại bằng nút Google nếu quên Mật Mã, không sợ mất tài khoản.");
        } catch (e) {
            if (e.code === 'auth/credential-already-in-use') alert("Tài khoản Google này đã được liên kết với một Đạo Hiệu khác rồi! Hãy dùng tài khoản Google khác, hoặc đăng nhập thẳng bằng Google để vào Đạo Hiệu đó.");
            else if (e.code === 'auth/provider-already-linked') alert("Đạo Hiệu này đã liên kết Google rồi!");
            else if (e.code === 'auth/popup-closed-by-user') { /* người dùng tự đóng popup, khỏi báo lỗi */ }
            else alert("Liên kết thất bại: " + (e.message || 'Không rõ nguyên nhân'));
        }
    };
    // ✉️ LIÊN KẾT EMAIL KHÔI PHỤC: đăng ký bằng Đạo Hiệu dùng email GIẢ nội bộ (...@thienkieu.com) nên Firebase không gửi được
    // thư thật. Gửi thư XÁC MINH (verifyBeforeUpdateEmail) tới email thật; chỉ sau khi người dùng bấm liên kết, email đăng nhập
    // mới đổi sang email đó. Email KHÔNG được lưu vào Firestore (hồ sơ công khai với người đã đăng nhập).
    const handleLinkRecoveryEmail = async () => {
        playSfx('CLICK');
        const clean = recoveryEmailInput.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return alert("Email không hợp lệ!");
        const fbUser = auth.currentUser;
        if (!fbUser) return alert("Không tìm thấy nguyên thần (User không tồn tại)!");
        try {
            // Gửi thư XÁC MINH tới email mới; email chỉ được gắn vào tài khoản SAU khi ngài bấm liên kết trong thư (tránh gõ nhầm/mạo nhận email người khác).
            await fbUser.verifyBeforeUpdateEmail(clean);
            playSfx('SUCCESS');
            alert(`Đã gửi thư xác minh tới ${clean}! Hãy mở thư (kể cả mục Spam) và bấm liên kết. Sau khi xác minh, đăng nhập bằng EMAIL NÀY + Mật Mã hiện tại (gõ email vào ô Đạo Hiệu).`);
            setRecoveryEmailInput('');
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') alert("Email này đã được dùng cho một tài khoản khác!");
            else if (e.code === 'auth/requires-recent-login') alert("Ngài đã bế quan quá lâu! Xin hãy đăng xuất và đăng nhập lại rồi thử lại.");
            else alert("Lỗi lưu Email: " + shortErr(e.message));
        }
    };
    // Quên Mật Khẩu (màn Đăng Nhập, chưa đăng nhập): gõ EMAIL KHÔI PHỤC đã xác minh vào ô Đạo Hiệu -> Firebase gửi liên kết đặt lại.
    // Thông báo trung tính (không cho biết email có tồn tại hay không).
    const handleForgotPassword = async () => {
        playSfx('CLICK');
        const raw = username.trim();
        if (!looksLikeEmail(raw)) return alert("Hãy gõ EMAIL KHÔI PHỤC (đã xác minh) vào ô Đạo Hiệu phía trên rồi bấm Quên Mật Khẩu. Nếu chưa từng gắn email: dùng Đăng nhập Google nếu đã liên kết, hoặc liên hệ quản trị viên.");
        try {
            await auth.sendPasswordResetEmail(raw);
            alert("Nếu email này thuộc một tài khoản, Liên Kết khôi phục Mật Mã đã được gửi. Hãy kiểm tra hộp thư (kể cả mục Spam).");
        } catch (e) {
            alert("Gửi email khôi phục thất bại: " + shortErr(e.message));
        }
    };

    return { agreeTerms, authMode, confirmChangePassword, forgotPasswordFromProfile, handleDeleteAccount, handleEmailAuth, handleForgotPassword, handleGoogleLogin, handleLinkGoogleAccount, handleLinkRecoveryEmail, handleLogout, password, pwdModal, recoveryEmailInput, setAgreeTerms, setAuthMode, setPassword, setPwdModal, setRecoveryEmailInput, setShowPwd, setUsername, showPwd, username };
}
