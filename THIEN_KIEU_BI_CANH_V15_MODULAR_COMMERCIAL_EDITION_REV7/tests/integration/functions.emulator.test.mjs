// Integration test Cloud Functions trên Firebase Emulator (CHƯA từng chạy trong phiên phát triển: sandbox không có Emulator).
// Chạy: terminal 1 `npm run emulators`   |   terminal 2 `npm run test:integration`
// Không cần SDK client: gọi callable bằng HTTP (giao thức onCall) với ID token lấy từ Auth Emulator; thiết lập/kiểm tra dữ liệu bằng firebase-admin (functions/node_modules).
import test from 'node:test'; import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import crypto from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'; process.env.GCLOUD_PROJECT ||= 'demo-tkbc';
if (!/^(127\.0\.0\.1|localhost):/.test(process.env.FIRESTORE_EMULATOR_HOST)) { console.error('Từ chối: không phải Emulator localhost.'); process.exit(2); }
let admin; try { admin = createRequire(path.join(root, 'functions', 'package.json'))('firebase-admin'); } catch { console.error('Thiếu firebase-admin: chạy `npm ci` trong functions/.'); process.exit(2); }
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT }); const db = admin.firestore(), auth = admin.auth();
const PROJECT = process.env.GCLOUD_PROJECT, REGION = 'asia-southeast1', FN = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001', AUTHH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
try { await fetch(`http://${FN}/`); } catch { console.error(`Không kết nối được Functions Emulator ${FN}. Hãy chạy "npm run emulators" trước.`); process.exit(2); }
const rid = () => crypto.randomBytes(12).toString('hex'); const uniq = (p) => `${p}_${rid().slice(0, 8)}`;
async function mkUser(prefix, doc = {}, claims = null) {
  const uid = uniq(prefix); await auth.createUser({ uid, email: `${uid}@thienkieu.com`, password: 'Passw0rd!x' });
  if (claims) await auth.setCustomUserClaims(uid, claims);
  await db.doc(`users/${uid}`).set({ name: uid.replace(/_/g, ''), spirit: 1000, fame: 0, guild: null, inventory: [], friends: [], requests: [], ...doc });
  const r = await fetch(`http://${AUTHH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${uid}@thienkieu.com`, password: 'Passw0rd!x', returnSecureToken: true }) });
  return { uid, token: (await r.json()).idToken };
}
// Trả { ok:true, result } hoặc { ok:false, status, message }
async function call(name, data, user) {
  const h = { 'content-type': 'application/json' }; if (user) h.authorization = `Bearer ${user.token}`;
  const r = await fetch(`http://${FN}/${PROJECT}/${REGION}/${name}`, { method: 'POST', headers: h, body: JSON.stringify({ data }) }); const j = await r.json();
  return j.error ? { ok: false, status: j.error.status, message: j.error.message } : { ok: true, result: j.result };
}
const mkGuild = async (name, leader, members) => db.doc(`guilds/${name}`).set({ name, level: 1, members, leader, guildId: String(Math.floor(100000 + Math.random() * 899999)), notice: '', exp: 0 });

test('chưa đăng nhập: mọi hàm nhạy cảm bị từ chối (UNAUTHENTICATED)', async () => {
  for (const fn of ['rollGacha', 'joinGuild', 'kickGuildMember', 'adminModerate']) { const r = await call(fn, { requestId: rid() }, null); assert.equal(r.ok, false, fn); assert.equal(r.status, 'UNAUTHENTICATED', fn); }
});
test('rollGacha: không đủ 200 LT bị từ chối, số dư không đổi', async () => {
  const u = await mkUser('poor', { spirit: 100 }); const r = await call('rollGacha', { requestId: rid() }, u);
  assert.equal(r.ok, false); assert.equal(r.status, 'FAILED_PRECONDITION'); assert.equal((await db.doc(`users/${u.uid}`).get()).data().spirit, 100);
});
test('rollGacha: đủ LT thì trừ phí + trao thưởng đúng; gọi lại cùng requestId KHÔNG trừ lần hai (idempotent)', async () => {
  const u = await mkUser('rich', { spirit: 1000 }); const id = rid();
  const a = await call('rollGacha', { requestId: id }, u); assert.equal(a.ok, true, JSON.stringify(a));
  const after1 = (await db.doc(`users/${u.uid}`).get()).data(); assert.equal(after1.spirit, 1000 + a.result.spirit); // result.spirit đã là mức thay đổi ròng (đã trừ 200)
  const b = await call('rollGacha', { requestId: id }, u); assert.equal(b.ok, true); assert.deepEqual(b.result, a.result);
  assert.equal((await db.doc(`users/${u.uid}`).get()).data().spirit, after1.spirit);
});
test('rollGacha: giới hạn tần suất (20 lần/phút) chặn lượt thứ 21+', async () => {
  const u = await mkUser('spam', { spirit: 1e7 }); let limited = 0;
  for (let i = 0; i < 24; i++) { const r = await call('rollGacha', { requestId: rid() }, u); if (!r.ok && r.status === 'RESOURCE_EXHAUSTED') limited++; }
  assert.ok(limited >= 1, 'không có lượt nào bị giới hạn');
});
test('joinGuild: vào Tông môn còn chỗ; đã có môn phái thì bị từ chối; Tông môn không tồn tại bị từ chối', async () => {
  const lead = await mkUser('lead'); const gname = uniq('Gate'); await mkGuild(gname, lead.uid, [lead.uid]); await db.doc(`users/${lead.uid}`).update({ guild: gname });
  const m = await mkUser('mem'); const ok = await call('joinGuild', { guild: gname, requestId: rid() }, m); assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.ok((await db.doc(`guilds/${gname}`).get()).data().members.includes(m.uid)); assert.equal((await db.doc(`users/${m.uid}`).get()).data().guild, gname);
  const again = await call('joinGuild', { guild: gname, requestId: rid() }, m); assert.equal(again.ok, false);
  const none = await call('joinGuild', { guild: 'khongtontai_' + rid(), requestId: rid() }, await mkUser('x')); assert.equal(none.ok, false);
});
test('kick / transfer: chỉ Bang Chủ; thành viên thường bị PERMISSION_DENIED', async () => {
  const lead = await mkUser('lead2'), a = await mkUser('a'), b = await mkUser('b'); const g = uniq('Gate');
  await mkGuild(g, lead.uid, [lead.uid, a.uid, b.uid]); for (const x of [lead, a, b]) await db.doc(`users/${x.uid}`).update({ guild: g });
  const denied = await call('kickGuildMember', { targetUid: b.uid, requestId: rid() }, a); assert.equal(denied.ok, false); assert.equal(denied.status, 'PERMISSION_DENIED');
  const deniedT = await call('transferGuildLeader', { targetUid: a.uid, requestId: rid() }, b); assert.equal(deniedT.status, 'PERMISSION_DENIED');
  const k = await call('kickGuildMember', { targetUid: b.uid, requestId: rid() }, lead); assert.equal(k.ok, true, JSON.stringify(k));
  assert.deepEqual((await db.doc(`guilds/${g}`).get()).data().members.sort(), [lead.uid, a.uid].sort()); assert.equal((await db.doc(`users/${b.uid}`).get()).data().guild, null);
  const t = await call('transferGuildLeader', { targetUid: a.uid, requestId: rid() }, lead); assert.equal(t.ok, true); assert.equal((await db.doc(`guilds/${g}`).get()).data().leader, a.uid);
  const selfKick = await call('kickGuildMember', { targetUid: a.uid, requestId: rid() }, a); assert.equal(selfKick.ok, false); // Bang Chủ không tự trục xuất
});
test('dissolveGuild: Bang Chủ giải tán -> xoá Tông môn và gỡ guild của mọi thành viên', async () => {
  const lead = await mkUser('lead3'), a = await mkUser('a3'); const g = uniq('Gate'); await mkGuild(g, lead.uid, [lead.uid, a.uid]); for (const x of [lead, a]) await db.doc(`users/${x.uid}`).update({ guild: g });
  const denied = await call('dissolveGuild', { requestId: rid() }, a); assert.equal(denied.status, 'PERMISSION_DENIED');
  const ok = await call('dissolveGuild', { requestId: rid() }, lead); assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal((await db.doc(`guilds/${g}`).get()).exists, false); assert.equal((await db.doc(`users/${a.uid}`).get()).data().guild, null);
});
test('adminModerate: người thường bị từ chối; admin (Custom Claim) ẩn nội dung + ghi adminAudit', async () => {
  const u = await mkUser('normal'); const adm = await mkUser('adm', {}, { admin: true }); const target = uniq('victim');
  const denied = await call('adminModerate', { action: 'hide', type: 'user', id: target, reportIds: [] }, u); assert.equal(denied.ok, false); assert.equal(denied.status, 'PERMISSION_DENIED');
  const ok = await call('adminModerate', { action: 'hide', type: 'user', id: target, reason: 'abuse', reportIds: [] }, adm); assert.equal(ok.ok, true, JSON.stringify(ok));
  const h = await db.doc(`hiddenContent/user__${encodeURIComponent(target)}`).get(); assert.equal(h.exists, true); assert.equal(h.data().hiddenBy, adm.uid);
  const audit = await db.collection('adminAudit').where('actor', '==', adm.uid).get(); assert.ok(audit.size >= 1);
  const un = await call('adminModerate', { action: 'unhide', key: `user__${encodeURIComponent(target)}` }, adm); assert.equal(un.ok, true); assert.equal((await db.doc(`hiddenContent/user__${encodeURIComponent(target)}`).get()).exists, false);
  const badIn = await call('adminModerate', { action: 'hide', type: 'admin', id: 'x' }, adm); assert.equal(badIn.ok, false); assert.equal(badIn.status, 'INVALID_ARGUMENT');
});
test('claimVideoQuizRound: tổng/điểm sai bị từ chối; hợp lệ được thưởng, trùng requestId không thưởng hai lần', async () => {
  const u = await mkUser('vid'); assert.equal((await call('claimVideoQuizRound', { score: 7, total: 6, requestId: rid() }, u)).ok, false);
  const id = rid(); const a = await call('claimVideoQuizRound', { score: 6, total: 6, requestId: id }, u); assert.equal(a.ok, true, JSON.stringify(a)); const s1 = (await db.doc(`users/${u.uid}`).get()).data().spirit;
  const b = await call('claimVideoQuizRound', { score: 6, total: 6, requestId: id }, u); assert.equal(b.ok, true); assert.equal((await db.doc(`users/${u.uid}`).get()).data().spirit, s1);
});
test('equipItem: chưa sở hữu bị từ chối; sở hữu thì trang bị đúng giá trị; tháo được; ô lạ bị từ chối', async () => {
  const u = await mkUser('eq', { inventory: ['luctruc', 'nc_cyan'] });
  const no = await call('equipItem', { slot: 'frame', itemId: 'huyetma' }, u); assert.equal(no.ok, false); assert.equal(no.status, 'FAILED_PRECONDITION');
  const ok = await call('equipItem', { slot: 'frame', itemId: 'luctruc' }, u); assert.equal(ok.ok, true, JSON.stringify(ok)); assert.equal((await db.doc(`users/${u.uid}`).get()).data().frame, 'luctruc');
  const c = await call('equipItem', { slot: 'nameColor', itemId: 'nc_cyan' }, u); assert.equal(c.ok, true); assert.equal((await db.doc(`users/${u.uid}`).get()).data().nameColor, '#00ffff');
  const off = await call('equipItem', { slot: 'frame', itemId: '' }, u); assert.equal(off.ok, true); assert.equal((await db.doc(`users/${u.uid}`).get()).data().frame, '');
  assert.equal((await call('equipItem', { slot: 'hack', itemId: 'luctruc' }, u)).ok, false);
});
