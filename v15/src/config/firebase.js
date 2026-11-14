// Cấu hình Firebase KHÔNG hardcode project nào. Nguồn cấu hình:
//   1) window.TKBC_FIREBASE_CONFIG (js/firebase-config.js — người triển khai tự tạo từ js/firebase-config.example.js)
//   2) Chạy local bằng Emulator: không cần cấu hình thật; dùng project giả "demo-tkbc" (không gọi dịch vụ Production).
// Bật Emulator khi: window.TKBC_USE_EMULATORS === true, hoặc (chạy trên localhost/127.0.0.1 VÀ chưa có cấu hình thật),
// hoặc trên localhost có ?emulator=1. Tắt cưỡng bức: window.TKBC_USE_EMULATORS = false.
import { FUNCTIONS_REGION } from './functionsConfig.js';

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
  const msg = 'Thiếu cấu hình Firebase: tạo js/firebase-config.js từ js/firebase-config.example.js (xem docs/guides/DEPLOYMENT_AND_HANDOVER.md).';
  typeof document !== 'undefined' && document.body && (document.body.innerHTML = '<pre style="color:#ff4500;background:#111;padding:16px;white-space:pre-wrap">' + msg + '</pre>');
  throw new Error(msg);
}
const firebaseConfig = USING_EMULATORS || !realConfig ? { apiKey: 'demo-api-key', authDomain: 'localhost', projectId: (realConfig && realConfig.projectId) || 'demo-tkbc', appId: 'demo-app' } : realConfig;

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
export const auth = firebase.auth(); export const firestore = firebase.firestore();

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
