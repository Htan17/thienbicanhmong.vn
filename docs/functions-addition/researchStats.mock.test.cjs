// Kiểm thử logic getResearchStats bằng Firestore giả lập (không cần emulator, không cần cài firebase).
// Chạy: node --test researchStats.mock.test.cjs
const test = require('node:test'), assert = require('node:assert/strict'), Module = require('module'), path = require('path'), fs = require('fs');

class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
let DB = { users: {}, admins: {}, quizShares: {}, videoShares: {}, guilds: {} }, FAIL = null, INITS = 0, apps = [1];

const fakeFirestore = () => ({
  collection: (name) => ({
    doc: (id) => ({ get: async () => { if (FAIL === 'admins') throw new Error('SECRET internal path /projects/x'); return { exists: id in DB[name] }; } }),
    count: () => ({ get: async () => ({ data: () => ({ count: Object.keys(DB[name]).length }) }) }),
    orderBy() { this._after = null; return this; },
    select(...f) { this._f = f; return this; },
    limit(n) { this._n = n; return this; },
    startAfter(id) { this._after = id; return this; },
    get: async function () {
      if (FAIL === 'users') throw new Error('SECRET firestore down');
      const ids = Object.keys(DB[name]).sort().filter((i) => this._after == null || i > this._after).slice(0, this._n);
      const docs = ids.map((id) => ({ id, data: () => Object.fromEntries(this._f.filter((k) => k in DB[name][id]).map((k) => [k, DB[name][id][k]])) }));
      return { empty: docs.length === 0, size: docs.length, docs };
    }
  })
});
const stubs = {
  'firebase-functions/v2/https': { onCall: (_o, h) => h, HttpsError },
  'firebase-functions/logger': { error() {} },
  'firebase-admin/app': { getApps: () => apps, initializeApp: () => { INITS++; apps = [1]; } },
  'firebase-admin/firestore': { getFirestore: fakeFirestore, FieldPath: { documentId: () => '__name__' } }
};
const origLoad = Module._load;
Module._load = function (req, ...r) { return stubs[req] || origLoad.call(this, req, ...r); };
const src = fs.readFileSync(path.join(__dirname, 'researchStats.block.js'), 'utf8');
const m = { exports: {} }; new Function('require', 'exports', 'module', 'process', src)(require, m.exports, m, process);
const call = m.exports.getResearchStats;
const code = async (p) => { try { await p; return 'OK'; } catch (e) { return e.code + '|' + e.message; } };
const NOW = Date.now();

test('chưa đăng nhập -> unauthenticated', async () => {
  assert.match(await code(call({ data: {} })), /^unauthenticated/);
  assert.match(await code(call({ auth: null, data: { isAdmin: true } })), /^unauthenticated/);
});
test('tài khoản thường (kể cả gửi isAdmin/uid giả) -> permission-denied', async () => {
  DB.admins = { adminX: {} };
  assert.match(await code(call({ auth: { uid: 'normal1' }, data: { isAdmin: true, role: 'admin', uid: 'adminX' } })), /^permission-denied\|Bạn không có quyền truy cập/);
});
test('admin -> số liệu đúng, không lộ dữ liệu nhạy cảm', async () => {
  DB.admins = { adminX: {} };
  DB.users = {
    u1: { studySeconds: 7200, streakCount: 5, spirit: 600, fame: 100, seasonScore: 50, lastActive: NOW, email: 'a@b.com', library: [1], friends: ['u2'] },
    u2: { studySeconds: 3600, streakCount: 9, spirit: 500, fame: 120, seasonScore: 0, lastActive: NOW - 3 * 86400000 },
    u3: { studySeconds: 0, streakCount: 0, spirit: 500, fame: 100, lastActive: NOW - 90 * 86400000 },
    u4: {}
  };
  DB.quizShares = { q1: {}, q2: {} }; DB.videoShares = { v1: {} }; DB.guilds = { g1: {} };
  const r = await call({ auth: { uid: 'adminX' }, data: {} });
  assert.equal(r.totalUsers, 4); assert.equal(r.totalStudySeconds, 10800); assert.equal(r.averageStudySeconds, 5400);
  assert.equal(r.totalSpirit, 1600); assert.equal(r.totalFame, 320); assert.equal(r.totalSeasonScore, 50); assert.equal(r.totalStreak, 14);
  assert.equal(r.totalQuizShares, 2); assert.equal(r.totalVideoShares, 1); assert.equal(r.totalGuilds, 1);
  assert.equal(r.activeUsers, 2); assert.equal(r.inactiveUsers, 2);
  assert.equal(r.topStudyUsers.length, 2); assert.equal(r.topStreakUsers[0].value, 9); assert.equal(r.topSeasonUsers.length, 1);
  assert.ok(r.unavailable.length >= 4);
  const json = JSON.stringify(r);
  for (const bad of ['u1', 'u2', 'u3', 'a@b.com', 'email', 'library', 'friends', 'adminX']) assert.ok(!json.includes(bad), 'lộ: ' + bad);
  assert.match(r.topStudyUsers[0].code, /^HS-[0-9A-F]{6}$/);
});
test('phân trang: > 1000 user', async () => {
  DB.users = {}; for (let i = 0; i < 2500; i++) DB.users['k' + String(i).padStart(5, '0')] = { studySeconds: 1, lastActive: NOW };
  DB.admins = { adminX: {} };
  const r = await call({ auth: { uid: 'adminX' }, data: {} });
  assert.equal(r.totalUsers, 2500); assert.equal(r.totalStudySeconds, 2500); assert.equal(r.topStudyUsers.length, 10);
});
test('Firestore không có dữ liệu -> trả 0, không lỗi', async () => {
  DB = { users: {}, admins: { adminX: {} }, quizShares: {}, videoShares: {}, guilds: {} };
  const r = await call({ auth: { uid: 'adminX' }, data: {} });
  assert.equal(r.totalUsers, 0); assert.equal(r.averageStudySeconds, 0); assert.deepEqual(r.topStudyUsers, []); assert.equal(r.inactiveUsers, 0);
});
test('function phát sinh lỗi -> internal, không lộ thông tin nội bộ', async () => {
  DB.admins = { adminX: {} };
  FAIL = 'users'; let c = await code(call({ auth: { uid: 'adminX' }, data: {} })); assert.match(c, /^internal\|/); assert.ok(!/SECRET|firestore down/.test(c));
  FAIL = 'admins'; c = await code(call({ auth: { uid: 'adminX' }, data: {} })); assert.match(c, /^internal\|/); assert.ok(!/SECRET|projects/.test(c));
  FAIL = null;
});
test('không có lệnh ghi nào trong block', () => {
  assert.ok(!/\.(set|update|delete|add|create|batch|runTransaction)\s*\(/.test(src.split('\n').filter((l) => !/createHash/.test(l)).join('\n').replace(/\/\/.*$/gm, '')), 'có lệnh ghi Firestore (bỏ qua .update của băm SHA-256)');
});
