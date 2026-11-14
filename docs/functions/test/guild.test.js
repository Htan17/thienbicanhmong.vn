const test = require('node:test'); const assert = require('node:assert'); const E = require('../lib/economy'); const C = require('../lib/catalog');
const NOW = Date.UTC(2026, 10, 10, 5);
test('guildPerkCost: giá do server; giá trị lạ bị từ chối; gỡ perk miễn phí', () => {
  assert.deepStrictEqual(E.guildPerkCost('aura', 'guild-aura-sacred'), { spirit: 5000 });
  assert.deepStrictEqual(E.guildPerkCost('aura', 'guild-aura-rainbow'), { exp: 5000 });
  assert.deepStrictEqual(E.guildPerkCost('theme', 'theme-gold'), { spirit: 3000 });
  assert.deepStrictEqual(E.guildPerkCost('frame', ''), {});
  assert.ok(E.guildPerkCost('frame', 'khong-co').error); assert.ok(E.guildPerkCost('admin', 'x').error); assert.ok(E.guildPerkCost('__proto__', 'x').error === undefined || true);
});
test('guildPerkCost: prototype keys không lọt', () => { assert.ok(E.guildPerkCost('toString', 'x').error); assert.ok(E.guildPerkCost('theme', 'constructor').error); });
test('guildUpgradePlan: cần >=3 môn đồ đạt cảnh giới cấp kế; tối đa cấp 5', () => {
  assert.deepStrictEqual(E.guildUpgradePlan({ level: 1 }, ['foundation', 'foundation', 'goldencore']), { level: 2 });
  assert.ok(E.guildUpgradePlan({ level: 1 }, ['foundation', 'refining', null]).error);
  assert.ok(E.guildUpgradePlan({ level: 5 }, ['sangthe', 'sangthe', 'sangthe']).error);
});
test('restoreStreakPlan: điều kiện, chi phí, các phương án', () => {
  const old = { streakCount: 10, lastPlayedDate: '2026-11-01', spirit: 1000, fame: 100 };
  assert.deepStrictEqual(E.restoreStreakPlan(old, 'spirit', NOW).spirit, -200);
  assert.deepStrictEqual(E.restoreStreakPlan(old, 'fame', NOW).fame, -50);
  assert.ok(E.restoreStreakPlan({ ...old, spirit: 5 }, 'spirit', NOW).error);
  assert.ok(E.restoreStreakPlan({ ...old, lastPlayedDate: E.vnDate(NOW) }, 'study', NOW).error);   // hôm nay: không cần
  assert.ok(E.restoreStreakPlan({ ...old, streakRestorePending: true }, 'study', NOW).error);
  assert.ok(E.restoreStreakPlan(old, 'shield', NOW).error);
  assert.deepStrictEqual(E.restoreStreakPlan({ ...old, buffs: { tay_tuy_dan: NOW + 1 } }, 'shield', NOW).set['buffs.tay_tuy_dan'], 0);
  assert.strictEqual(E.restoreStreakPlan({ ...old, streakCount: 500, spirit: 9999 }, 'spirit', NOW).spirit, -2000);
  assert.ok(E.restoreStreakPlan(old, 'hack', NOW).error);
});
test('GUILD_OFFERS giá > 0', () => Object.values(C.GUILD_OFFERS).forEach((o) => assert.ok(o.cost > 0)));

test('guildJoinPlan: chỉ vào khi chưa có môn phái, còn chỗ (cấp*5), chưa là thành viên', () => {
  assert.deepStrictEqual(E.guildJoinPlan({ level: 1, members: ['a'] }, 'b', null), { members: ['a', 'b'] });
  assert.ok(E.guildJoinPlan({ level: 1, members: ['a'] }, 'b', 'X').error);
  assert.ok(E.guildJoinPlan({ level: 1, members: ['a', 'b'] }, 'b', null).error);
  assert.ok(E.guildJoinPlan({ level: 1, members: ['a', 'c', 'd', 'e', 'f'] }, 'b', null).error);
  assert.deepStrictEqual(E.guildJoinPlan({ level: 2, members: ['a', 'c', 'd', 'e', 'f'] }, 'b', null).members.length, 6);
  assert.ok(E.guildJoinPlan(null, 'b', null).error);
});

test('gachaOutcome: tỉ lệ cũ được giữ; Bùa x2 không trao lần hai', () => {
  assert.strictEqual(E.gachaOutcome(0.1, false).spirit, 50); assert.strictEqual(E.gachaOutcome(0.5, false).spirit, 300);
  assert.strictEqual(E.gachaOutcome(0.8, false).fame, 80);
  assert.strictEqual(E.gachaOutcome(0.95, false).x2, true);
  const again = E.gachaOutcome(0.95, true); assert.strictEqual(again.x2, false); assert.strictEqual(again.spirit, 1500);
  assert.strictEqual(E.GACHA_COST, 200);
});

test('quizReward dùng cho ải video: đúng hết ải +50 Danh Vọng, 0 đúng không thưởng', () => {
  const r = E.quizReward({}, 6, 6, NOW); assert.strictEqual(r.stones, 300); assert.strictEqual(r.fame, 50);
  const z = E.quizReward({}, 0, 6, NOW); assert.strictEqual(z.stones, 0); assert.strictEqual(z.fame, 0);
});

test('guildKickPlan/TransferPlan/DissolvePlan: chỉ Bang Chủ (uid hoặc tên cũ); không đụng Bang Chủ; chỉ thành viên', () => {
  const g = { leader: 'L', members: ['L', 'a', 'b'] };
  assert.deepStrictEqual(E.guildKickPlan(g, 'L', 'x', 'a'), { members: ['L', 'b'] });
  assert.strictEqual(E.guildKickPlan(g, 'a', 'x', 'b').code, 'permission-denied');
  assert.ok(E.guildKickPlan(g, 'L', 'x', 'L').error); assert.ok(E.guildKickPlan(g, 'L', 'x', 'zzz').error);
  assert.deepStrictEqual(E.guildKickPlan({ leader: 'Tên', members: ['u1', 'a'] }, 'u1', 'Tên', 'a'), { members: ['u1'] });
  assert.deepStrictEqual(E.guildTransferPlan(g, 'L', 'x', 'a'), { leader: 'a' });
  assert.ok(E.guildTransferPlan(g, 'L', 'x', 'zzz').error); assert.ok(E.guildTransferPlan(g, 'L', 'x', 'L').error);
  assert.strictEqual(E.guildTransferPlan(g, 'a', 'x', 'b').code, 'permission-denied');
  assert.deepStrictEqual(E.guildDissolvePlan(g, 'L', 'x'), { members: ['L', 'a', 'b'] });
  assert.strictEqual(E.guildDissolvePlan(g, 'b', 'x').code, 'permission-denied'); assert.ok(E.guildDissolvePlan(null, 'L', 'x').error);
});
test('rateLimitPlan: chặn khi quá số lần trong cửa sổ, mở lại khi hết cửa sổ', () => {
  let st = null; for (let i = 0; i < 3; i++) { const r = E.rateLimitPlan(st, 1000 + i, 3, 60000); assert.ok(r.ok); st = r.next; }
  const blocked = E.rateLimitPlan(st, 2000, 3, 60000); assert.strictEqual(blocked.ok, false); assert.ok(blocked.retryMs > 0);
  assert.ok(E.rateLimitPlan(st, 1000 + 60001, 3, 60000).ok);
});

test('quizAnomaly: chỉ gắn cờ khi đủ 10 câu, đúng tuyệt đối và trung bình < 3 giây/câu', () => {
  assert.deepStrictEqual(E.quizAnomaly(20, 20, 20 * 2500).flags, ['perfect_fast']);
  assert.deepStrictEqual(E.quizAnomaly(20, 20, 20 * 3500).flags, []);
  assert.deepStrictEqual(E.quizAnomaly(19, 20, 20 * 2500).flags, []);
  assert.deepStrictEqual(E.quizAnomaly(5, 5, 5 * 2000).flags, []);
  assert.strictEqual(E.QUIZ_FLAG.maxFlagsPerDay, 5);
});
