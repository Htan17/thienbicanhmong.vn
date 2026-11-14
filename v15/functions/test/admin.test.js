const test = require('node:test'); const assert = require('node:assert'); const A = require('../lib/admin');
test('isAdminToken: chỉ admin === true (không nhận chuỗi/1)', () => {
  assert.ok(A.isAdminToken({ admin: true })); assert.ok(!A.isAdminToken({ admin: 'true' })); assert.ok(!A.isAdminToken({ admin: 1 })); assert.ok(!A.isAdminToken(null)); assert.ok(!A.isAdminToken({}));
});
test('moderationPlan: hide/dismiss cần type+id hợp lệ, báo cáo phải khớp đối tượng', () => {
  const key = A.hiddenKey('user', 'a b'); assert.strictEqual(key, 'user__a%20b');
  const ok = A.moderationPlan({ action: 'hide', type: 'user', id: 'a b', reason: 'scam', reportIds: ['bob__' + key] });
  assert.strictEqual(ok.key, key); assert.strictEqual(ok.reason, 'scam'); assert.strictEqual(ok.reportIds.length, 1);
  assert.ok(A.moderationPlan({ action: 'hide', type: 'user', id: 'a b', reportIds: ['bob__user__other'] }).error);
  assert.ok(A.moderationPlan({ action: 'hide', type: 'admin', id: 'x' }).error); assert.ok(A.moderationPlan({ action: 'hide', type: 'user', id: '' }).error);
  assert.ok(A.moderationPlan({ action: 'drop' }).error); assert.ok(A.moderationPlan(null).error);
  assert.ok(A.moderationPlan({ action: 'dismiss', type: 'guild', id: 'G', reportIds: Array(201).fill('x__guild__G') }).error);
  assert.ok(A.moderationPlan({ action: 'dismiss', type: 'guild', id: 'G', reportIds: ['a/b__guild__G'] }).error);
});
test('moderationPlan: unhide chỉ nhận khoá dạng type__id, không chứa /', () => {
  assert.strictEqual(A.moderationPlan({ action: 'unhide', key: 'quiz__ABCDEFGH' }).key, 'quiz__ABCDEFGH');
  assert.ok(A.moderationPlan({ action: 'unhide', key: 'users/alice' }).error); assert.ok(A.moderationPlan({ action: 'unhide', key: 'user__a/b' }).error); assert.ok(A.moderationPlan({ action: 'unhide' }).error);
});
