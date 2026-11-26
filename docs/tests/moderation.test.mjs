import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.firebase = { apps: [1], auth: () => ({}), firestore: () => ({}) };
const m = await import('../src/lib/moderation.js');

test('hiddenKey / reportDocId', () => {
  assert.equal(m.hiddenKey('user', 'abc'), 'user__abc');
  assert.equal(m.hiddenKey('guild', 'Thiên Môn'), 'guild__Thi%C3%AAn%20M%C3%B4n');
  assert.equal(m.reportDocId('U1', 'quiz', 'ABCD2345'), 'U1__quiz__ABCD2345');
});
test('maskUser che ảnh/di ngôn/tên khi bị ẩn, giữ nguyên khi không', () => {
  const u = { uid: 'U2', name: 'x', bio: 'xấu', photo: 'p', bgImage: 'b', spirit: 9 };
  const hidden = new Set([m.hiddenKey('user', 'U2')]);
  const r = m.maskUser(u, hidden);
  assert.equal(r.bio, m.HIDDEN_PLACEHOLDER_TEXT); assert.equal(r.bgImage, ''); assert.equal(r._hidden, true); assert.equal(r.spirit, 9);
  assert.equal(m.maskUser(u, new Set()), u);
});
test('maskGuilds giữ khoá/name (tránh vỡ logic so khớp) nhưng che cáo thị', () => {
  const g = { A: { name: 'A', notice: 'bậy' }, B: { name: 'B', notice: 'ok' } };
  const r = m.maskGuilds(g, new Set([m.hiddenKey('guild', 'A')]));
  assert.equal(r.A.name, 'A'); assert.equal(r.A.notice, m.HIDDEN_PLACEHOLDER_TEXT); assert.equal(r.B.notice, 'ok');
  assert.equal(m.guildLabel(r.A), m.HIDDEN_GUILD_LABEL); assert.equal(m.guildLabel(r.B), 'B');
});
test('groupReports gộp theo đối tượng, nhiều báo cáo nhất lên đầu', () => {
  const g = m.groupReports([
    { id: 'r1', targetType: 'user', targetId: 'U2', reason: 'abuse', note: 'a' },
    { id: 'r2', targetType: 'user', targetId: 'U2', reason: 'scam' },
    { id: 'r3', targetType: 'guild', targetId: 'G', reason: 'abuse' },
  ]);
  assert.equal(g[0].id, 'U2'); assert.equal(g[0].count, 2); assert.deepEqual(g[0].reportIds, ['r1', 'r2']); assert.equal(g.length, 2);
});
