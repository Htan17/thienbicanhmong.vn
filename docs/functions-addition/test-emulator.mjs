// Kiểm thử getResearchStats trên Firebase Emulator (Node 18+). KHÔNG chạm Firebase thật: chỉ gọi 127.0.0.1.
// Cách chạy:  node test-emulator.mjs <PROJECT_ID> [region=us-central1]            -> 5 ca chính
//            node test-emulator.mjs <PROJECT_ID> [region] --expect-internal      -> ca function lỗi (xem HUONG_DAN.md mục 5)
const [, , PROJECT, REGION = 'us-central1', FLAG] = process.argv;
if (!PROJECT) { console.error('Thiếu PROJECT_ID'); process.exit(2); }
const FN = `http://127.0.0.1:5001/${PROJECT}/${REGION}/getResearchStats`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
let fails = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + extra)); if (!ok) fails++; };
const signUp = async (email) => (await (await fetch(AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Test1234!', returnSecureToken: true }) })).json());
const call = async (token, data = {}) => { const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ data }) }); return { status: r.status, text: await r.text() }; };
const put = (path, fields) => fetch(`${FS}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) });
const clear = () => fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
const int = (n) => ({ integerValue: String(n) });

const normal = await signUp(`normal${Date.now()}@test.local`);
const admin = await signUp(`admin${Date.now()}@test.local`);

if (FLAG === '--expect-internal') {
  const r = await call(admin.idToken);
  check('function lỗi -> 500 INTERNAL', r.status === 500 && /INTERNAL/.test(r.text), r.status + ' ' + r.text);
  check('không lộ thông tin nội bộ', !/ECONNREFUSED|127\.0\.0\.1|stack|at \w+/.test(r.text), r.text);
  process.exit(fails ? 1 : 0);
}

await clear();
await put(`users/uidA`, { email: { stringValue: 'secret@x.com' }, studySeconds: int(7200), streakCount: int(5), spirit: int(600), fame: int(100), seasonScore: int(50), lastActive: int(Date.now()) });
await put(`users/uidB`, { studySeconds: int(3600), streakCount: int(9), spirit: int(500), fame: int(120), lastActive: int(Date.now() - 90 * 86400000) });
await put(`quizShares/q1`, { t: { stringValue: 'x' } });
await put(`admins/${admin.localId}`, {});

let r = await call(null);
check('1. chưa đăng nhập -> 401 UNAUTHENTICATED', r.status === 401 && /UNAUTHENTICATED/.test(r.text), r.status + ' ' + r.text);
r = await call(normal.idToken);
check('2. tài khoản thường -> 403 PERMISSION_DENIED', r.status === 403 && /PERMISSION_DENIED/.test(r.text), r.status + ' ' + r.text);
check('2b. không có số liệu trong phản hồi', !/totalUsers/.test(r.text), r.text);
r = await call(normal.idToken, { isAdmin: true, role: 'admin', uid: admin.localId });
check('2c. giả mạo isAdmin/uid từ client vẫn bị chặn', r.status === 403, r.status + ' ' + r.text);
r = await call(admin.idToken);
let res; try { res = JSON.parse(r.text).result; } catch { res = null; }
check('3. admin -> 200 và đúng số liệu', r.status === 200 && res && res.totalUsers === 2 && res.totalStudySeconds === 10800 && res.totalQuizShares === 1 && res.activeUsers === 1 && res.inactiveUsers === 1, r.status + ' ' + r.text.slice(0, 200));
check('3b. không lộ email/uid/trường nhạy cảm', !/secret@x\.com|uidA|uidB|"email"|friends|library/.test(r.text), r.text.slice(0, 300));
await clear(); await put(`admins/${admin.localId}`, {});
r = await call(admin.idToken); try { res = JSON.parse(r.text).result; } catch { res = null; }
check('4. Firestore không có dữ liệu -> 200, toàn số 0', r.status === 200 && res && res.totalUsers === 0 && res.averageStudySeconds === 0 && res.topStudyUsers.length === 0, r.status + ' ' + r.text.slice(0, 200));
await clear();
console.log(fails ? `\n${fails} ca FAIL` : '\nTất cả ca đạt'); process.exit(fails ? 1 : 0);
