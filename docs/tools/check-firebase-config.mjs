// Chẩn đoán cấu hình Firebase: node tools/check-firebase-config.mjs [--online]
// Mặc định chỉ kiểm tra định dạng (offline). Với --online gọi thử Identity Toolkit bằng tài khoản giả để biết Google CÓ chấp nhận apiKey không.
//   Kết quả "API_KEY_INVALID"  → key sai/đã xoá (đây chính là nguồn gốc của auth/api-key-not-valid).
//   Kết quả EMAIL_NOT_FOUND / INVALID_LOGIN_CREDENTIALS / INVALID_PASSWORD → key HỢP LỆ.
//   Kết quả có "referer"/"blocked" → key bị hạn chế domain/API trong Google Cloud Console.
import { readFileSync } from 'node:fs';
import { validateFirebaseConfig } from '../src/config/firebaseConfigCheck.js';
const src = readFileSync(new URL('../js/firebase-config.js', import.meta.url), 'utf8');
const window = {}; new Function('window', src)(window);
const cfg = window.TKBC_FIREBASE_CONFIG;
const r = validateFirebaseConfig(cfg);
console.log(r.ok ? 'Định dạng cấu hình: OK' : 'Định dạng cấu hình: LỖI\n- ' + r.problems.join('\n- '));
if (!r.ok) process.exit(1);
if (process.argv.includes('--online')) {
  const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(cfg.apiKey), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tkbc-probe@example.invalid', password: 'x', returnSecureToken: true }),
  });
  const j = await res.json().catch(() => ({}));
  const m = (j.error && (j.error.message || (j.error.errors && j.error.errors[0] && j.error.errors[0].reason))) || res.status;
  console.log('Google trả về:', m);
  console.log(/API_KEY_INVALID|keyInvalid/i.test(String(m)) ? '=> apiKey KHÔNG được Google chấp nhận: đối chiếu lại với Firebase Console.' : /EMAIL_NOT_FOUND|INVALID_LOGIN|INVALID_PASSWORD/.test(String(m)) ? '=> apiKey HỢP LỆ.' : '=> Cần xem thêm (có thể bị hạn chế referrer/API).');
}
