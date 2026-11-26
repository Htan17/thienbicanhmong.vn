// Kiểm tra cấu hình Firebase Web TRƯỚC khi gọi initializeApp (hàm thuần, không phụ thuộc trình duyệt nên test được bằng Node).
// Mục đích: không bao giờ gửi apiKey rỗng / còn placeholder / sai định dạng lên Google. Khi đó Identity Toolkit trả về
// "auth/api-key-not-valid.-please-pass-a-valid-api-key." mà không chỉ rõ nguyên nhân thật.
const PLACEHOLDER = /^(your[-_ ]|<|\{|xxx|todo|changeme|demo-|example)/i;

// Web API key của Google luôn bắt đầu "AIza" + 35 ký tự [0-9A-Za-z_-] (tổng 39).
export const isWellFormedApiKey = (k) => typeof k === 'string' && /^AIza[0-9A-Za-z_-]{35}$/.test(k);

// Trả về { ok, problems[] }. KHÔNG tự suy đoán hay sửa giá trị: chỉ báo cái gì sai để chủ dự án đối chiếu với Firebase Console.
export function validateFirebaseConfig(cfg) {
  const problems = [];
  if (!cfg || typeof cfg !== 'object') return { ok: false, problems: ['window.TKBC_FIREBASE_CONFIG không tồn tại (js/firebase-config.js không được nạp hoặc bị rỗng).'] };
  const need = ['apiKey', 'authDomain', 'projectId', 'appId'];
  for (const f of need) {
    const v = cfg[f];
    if (v === undefined || v === null || String(v).trim() === '') problems.push(`Thiếu "${f}" (undefined/null/rỗng).`);
    else if (PLACEHOLDER.test(String(v).trim())) problems.push(`"${f}" vẫn là giá trị mẫu/placeholder: ${String(v).slice(0, 24)}`);
  }
  if (cfg.apiKey && !PLACEHOLDER.test(String(cfg.apiKey)) && !isWellFormedApiKey(cfg.apiKey)) problems.push('"apiKey" sai định dạng (phải dạng AIza… dài 39 ký tự, không khoảng trắng/dấu nháy thừa).');
  if (cfg.authDomain && cfg.projectId && !String(cfg.authDomain).startsWith(cfg.projectId + '.') && !/^localhost|\./.test(String(cfg.authDomain))) problems.push('"authDomain" không giống tên miền Firebase hợp lệ.');
  if (cfg.appId && cfg.projectId && /^\d+:\d+:web:/.test(String(cfg.appId)) === false && !PLACEHOLDER.test(String(cfg.appId))) problems.push('"appId" không đúng dạng "<số>:<số>:web:<mã>".');
  return { ok: problems.length === 0, problems };
}
