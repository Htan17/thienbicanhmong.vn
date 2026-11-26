// Cấu hình Firebase KHÔNG hardcode project nào. Nguồn cấu hình:
//   1) window.TKBC_FIREBASE_CONFIG (js/firebase-config.js — người triển khai tự tạo từ js/firebase-config.example.js)
//   2) Chạy local bằng Emulator: không cần cấu hình thật; dùng project giả "demo-tkbc" (không gọi dịch vụ Production).
// Bật Emulator khi: window.TKBC_USE_EMULATORS === true, hoặc (chạy trên localhost/127.0.0.1 VÀ chưa có cấu hình thật),
// hoặc trên localhost có ?emulator=1. Tắt cưỡng bức: window.TKBC_USE_EMULATORS = false.
import { FUNCTIONS_REGION } from './functionsConfig.js';
import { validateFirebaseConfig } from './firebaseConfigCheck.js';

const EMU = { host: '127.0.0.1', auth: 9099, firestore: 8080, functions: 5001 };
// Bảo vệ khi nạp ngoài trình duyệt (test Node chỉ giả lập biến `firebase`).
const W = typeof window !== 'undefined' ? window : {};
const L = typeof location !== 'undefined' ? location : { hostname: '', search: '' };
const isLocalHost = ['localhost', '127.0.0.1'].includes(L.hostname);
const realConfig = W.TKBC_FIREBASE_CONFIG && W.TKBC_FIREBASE_CONFIG.projectId ? W.TKBC_FIREBASE_CONFIG : null;
const forced = W.TKBC_USE_EMULATORS;
const isNodeTest = typeof window === 'undefined';
export const USING_EMULATORS = forced === true || (forced !== false && isLocalHost && (!realConfig || /[?&]emulator=1\b/.test(L.search)));

if (!USING_EMULATORS && !realConfig && !isNodeTest) {
  const msg = 'Thiếu cấu hình Firebase: ' + (W.__tkbcConfigLoadFailed ? 'trình duyệt KHÔNG tải được js/firebase-config.js (404/bị chặn/sai đường dẫn khi deploy). Kiểm tra file đã được commit và deploy cùng app.html.' : 'tạo js/firebase-config.js từ js/firebase-config.example.js') + ' (xem docs/guides/DEPLOYMENT_AND_HANDOVER.md).';
  typeof document !== 'undefined' && document.body && (document.body.innerHTML = '<pre style="color:#ff4500;background:#111;padding:16px;white-space:pre-wrap">' + msg + '</pre>');
  throw new Error(msg);
}
// Cấu hình thật có mặt nhưng hỏng (apiKey rỗng/placeholder/sai định dạng): dừng NGAY với thông báo rõ nguyên nhân,
// thay vì để Google trả về "auth/api-key-not-valid" khó hiểu khi người dùng bấm Đăng nhập.
if (!USING_EMULATORS && !isNodeTest && W.TKBC_FIREBASE_CONFIG) {
  const chk = validateFirebaseConfig(W.TKBC_FIREBASE_CONFIG);
  if (!chk.ok) {
    const msg = 'Cấu hình Firebase (js/firebase-config.js) không hợp lệ:\n- ' + chk.problems.join('\n- ') + '\nĐối chiếu với Firebase Console → Project settings → Your apps → Web app.';
    typeof document !== 'undefined' && document.body && (document.body.innerHTML = '<pre style="color:#ff4500;background:#111;padding:16px;white-space:pre-wrap"></pre>', document.body.firstChild.textContent = msg);
    throw new Error(msg);
  }
}
const firebaseConfig = USING_EMULATORS || !realConfig ? { apiKey: 'demo-api-key', authDomain: 'localhost', projectId: (realConfig && realConfig.projectId) || 'demo-tkbc', appId: 'demo-app' } : realConfig;

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
export const auth = firebase.auth(); export const firestore = firebase.firestore();
// ĐĂNG NHẬP/TẢI DỮ LIỆU CHẬM Ở MỘT SỐ MẠNG (nhà mạng, Wi-Fi công ty/trường, proxy): kết nối streaming (WebChannel) của Firestore bị chặn
// nên phải đợi hết thời gian chờ rồi mới chạy được. Tự phát hiện và chuyển sang long-polling giúp vào app nhanh và ổn định hơn.
// Phải gọi TRƯỚC mọi thao tác Firestore; bỏ qua khi chạy Emulator.
if (!USING_EMULATORS) { try { firestore.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) { console.warn('[TKBC] Không đặt được tuỳ chọn kết nối Firestore:', e && e.message); } }

let functionsInst = null;
// Một instance Functions dùng chung (đúng region; trỏ về Emulator khi chạy local).
export const getFunctions = () => {
  if (!functionsInst) {
    functionsInst = firebase.app().functions(FUNCTIONS_REGION);
    if (USING_EMULATORS) functionsInst.useEmulator(EMU.host, EMU.functions);
  }
  return functionsInst;
};
if (USING_EMULATORS) {
  auth.useEmulator('http://' + EMU.host + ':' + EMU.auth);
  firestore.useEmulator(EMU.host, EMU.firestore);
  console.info('[TKBC] Đang chạy với Firebase Emulator (project giả), KHÔNG kết nối Production.');
}
