const test = require('node:test'); const assert = require('node:assert');
const { runCheckpointed } = require('../lib/checkpoint');
// Firestore giả tối thiểu (doc get/set/update, batch atomic) để mô phỏng sự cố giữa chừng.
function fakeDb(seed, failOnCommit) {
  const m = new Map(Object.entries(seed)); let commits = 0;
  const ref = (path) => ({ path, async get() { const d = m.get(path); return { exists: d !== undefined, data: () => (d === undefined ? undefined : JSON.parse(JSON.stringify(d))) }; }, async set(v) { m.set(path, JSON.parse(JSON.stringify(v))); } });
  return { m, doc: ref, batch() { const ops = []; return { set: (r, v, o) => ops.push(['set', r.path, v, o]), update: (r, v) => ops.push(['update', r.path, v]), async commit() { commits++; if (failOnCommit && failOnCommit(commits)) throw new Error('boom'); ops.forEach(([k, p, v, o]) => m.set(p, k === 'update' || (o && o.merge) ? { ...(m.get(p) || {}), ...v } : v)); } }; } };
}
const mk = (db, paid) => ({ name: 'season', now: 1000, nextFn: (n) => n + 500, snapshot: async () => Array.from({ length: 5 }, (_, i) => ({ uid: 'u' + i })), applyItem: (b, it) => { paid.push(it.uid); b.update(db.doc('users/' + it.uid), { got: true }); }, chunkSize: 2 });
test('chưa tới hạn => không làm gì', async () => { const db = fakeDb({ 'meta/season': { nextReset: 5000 } }); assert.strictEqual((await runCheckpointed(db, { ...mk(db, []), now: 1000 })).ran, false); });
test('chạy trọn vẹn: phát đủ 1 lần, nextReset đẩy lên CUỐI cùng', async () => {
  const db = fakeDb({ 'meta/season': { nextReset: 900 } }), paid = []; await runCheckpointed(db, mk(db, paid));
  assert.deepStrictEqual(paid, ['u0', 'u1', 'u2', 'u3', 'u4']); assert.strictEqual(db.m.get('meta/season').nextReset, 1500); assert.strictEqual(db.m.get('maintenanceRuns/season_900').status, 'done');
});
test('lỗi giữa chừng => nextReset CHƯA đổi; chạy lại tiếp tục, không phát trùng', async () => {
  let paid = []; const db = fakeDb({ 'meta/season': { nextReset: 900 } }, (n) => n === 2); // lô thứ 2 commit thất bại
  await assert.rejects(runCheckpointed(db, mk(db, paid)));
  assert.strictEqual(db.m.get('meta/season').nextReset, 900, 'không được đẩy nextReset khi chưa xong');
  assert.strictEqual(db.m.get('maintenanceRuns/season_900').cursor, 2);
  const applied = ['u0', 'u1'].filter((u) => db.m.get('users/' + u)); assert.strictEqual(applied.length, 2);
  paid = []; await runCheckpointed(db, { ...mk(db, paid), snapshot: async () => { throw new Error('không được chụp lại bảng xếp hạng'); } });
  assert.deepStrictEqual(paid, ['u2', 'u3', 'u4']); assert.strictEqual(db.m.get('meta/season').nextReset, 1500);
});
test('chạy lại khi run đã done mà meta chưa đẩy => chỉ đẩy meta, không phát lại', async () => {
  const db = fakeDb({ 'meta/season': { nextReset: 900 }, 'maintenanceRuns/season_900': { status: 'done', items: [{ uid: 'u0' }], cursor: 1 } }), paid = [];
  await runCheckpointed(db, mk(db, paid)); assert.deepStrictEqual(paid, []); assert.strictEqual(db.m.get('meta/season').nextReset, 1500);
});

test('meta chưa tồn tại / nextReset hỏng => server khởi tạo mốc kế tiếp, KHÔNG phát thưởng', async () => {
  for (const seed of [{}, { 'meta/season': {} }, { 'meta/season': { nextReset: 0 } }, { 'meta/season': { nextReset: 'abc' } }]) {
    const db = fakeDb(seed), paid = []; const r = await runCheckpointed(db, mk(db, paid));
    assert.strictEqual(r.ran, false); assert.strictEqual(r.initialized, true); assert.deepStrictEqual(paid, []); assert.strictEqual(db.m.get('meta/season').nextReset, 1500);
  }
});
