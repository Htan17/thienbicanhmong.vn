const test = require('node:test'); const assert = require('node:assert');
const E = require('../lib/economy'); const C = require('../lib/catalog');
const NOW = Date.UTC(2026, 10, 10, 5, 0, 0);
test('quizReward: 0 đúng = 0 thưởng', () => assert.deepStrictEqual(E.quizReward({}, 0, 10, NOW), { stones: 0, fame: 0, season: 0, lesson: 0 }));
test('quizReward: đúng hết 5 câu = 250 LT, 50 DV, 10 điểm mùa', () => assert.deepStrictEqual(E.quizReward({ rank: 'refining' }, 5, 5, NOW), { stones: 250, fame: 50, season: 10, lesson: 1 }));
test('quizReward: bonus cảnh giới + x2 + buff', () => {
  const u = { rank: 'foundation', x2BoostExpiresAt: NOW + 1000, buffs: { linh_tu_phu: NOW + 1000 } };
  assert.strictEqual(E.quizReward(u, 2, 4, NOW).stones, Math.round(Math.round(Math.round(100 * 1.05) * 2) * 1.5));
});
test('quizReward: buff hết hạn không tính', () => assert.strictEqual(E.quizReward({ buffs: { linh_tu_phu: NOW - 1 } }, 1, 2, NOW).stones, 50));
test('applyDailyCap: chặn vượt trần và sang ngày mới thì reset', () => {
  const a = E.applyDailyCap({ day: E.vnDay(NOW), spirit: 29900, fame: 0 }, NOW, { stones: 500, fame: 10 }, { spirit: 30000, fame: 1500 });
  assert.strictEqual(a.s, 100); assert.strictEqual(a.f, 10);
  const b = E.applyDailyCap({ day: '2000-01-01', spirit: 30000, fame: 1500 }, NOW, { stones: 500, fame: 10 }, { spirit: 30000, fame: 1500 });
  assert.strictEqual(b.s, 500);
});
test('purchasePlan: giá do server, không đủ tiền bị từ chối', () => {
  assert.ok(E.purchasePlan({ spirit: 10 }, 'luctruc', NOW).error);
  const p = E.purchasePlan({ spirit: 100, inventory: [] }, 'luctruc', NOW); assert.strictEqual(p.price, 50);
});
test('purchasePlan: không mua trùng vật phẩm không chồng được; mua bùa có giới hạn ngày', () => {
  assert.ok(E.purchasePlan({ spirit: 1e6, inventory: ['luctruc'] }, 'luctruc', NOW).error);
  let u = { spirit: 1e6, inventory: [] };
  for (let i = 0; i < 2; i++) { const p = E.purchasePlan(u, 'x2_card', NOW); assert.ok(!p.error); u = { ...u, inventory: p.inventory, dailyPurchases: p.dailyPurchases }; }
  assert.ok(E.purchasePlan(u, 'x2_card', NOW).error);
});
test('purchasePlan: vật phẩm lạ bị từ chối', () => assert.ok(E.purchasePlan({ spirit: 1e9 }, 'hack', NOW).error));
test('rankUpgrade: chỉ lên bậc kế, cần đủ LT/DV', () => {
  assert.ok(E.rankUpgrade({ rank: 'refining', spirit: 1e9, fame: 1e9 }, 'divine').error);
  assert.deepStrictEqual(E.rankUpgrade({ rank: 'refining', spirit: 500, fame: 0 }, 'foundation'), { spirit: -500, fame: 100 });
  assert.ok(E.rankUpgrade({ rank: 'nascent', spirit: 10000, fame: 999 }, 'divine').error);
});
test('catalog: mọi vật phẩm có giá dương', () => Object.values(C.SHOP).forEach((i) => assert.ok(i.price > 0)));

test('repeatPlan: gắn cờ khi lặp cùng bộ câu hỏi quá ngưỡng trong ngày; sang ngày reset; giới hạn số khoá', () => {
  let st = null, last; for (let i = 0; i < 9; i++) { last = E.repeatPlan(st, '2026-11-13', 'abc', 8); st = last.next; }
  assert.strictEqual(last.count, 9); assert.strictEqual(last.flagged, true);
  assert.strictEqual(E.repeatPlan(st, '2026-11-14', 'abc', 8).count, 1);
  assert.strictEqual(E.repeatPlan(null, 'd', 'x', 8).flagged, false); assert.strictEqual(E.repeatPlan(null, 'd', null).next, null);
  const full = { day: 'd', counts: Object.fromEntries(Array.from({ length: 50 }, (_, i) => ['k' + i, 1])) };
  assert.strictEqual(E.repeatPlan(full, 'd', 'new').count, 0);
});
