// Parity client (src/lib/progress.js) <-> server (lib/economy.js): cùng đầu vào, cùng kết quả.
import test, { mock } from 'node:test'; import assert from 'node:assert'; import { createRequire } from 'node:module';
import { calculateStreak, isExamPathWindowOpen } from '../../src/lib/progress.js';
const E = createRequire(import.meta.url)('../lib/economy.js');
const T = [Date.UTC(2026, 10, 10, 0, 30), Date.UTC(2026, 10, 10, 20, 0), Date.UTC(2026, 10, 10, 21, 59), Date.UTC(2026, 10, 11, 16, 0), Date.UTC(2026, 11, 31, 17, 30)];
test('streak: server == client', () => {
  for (const now of T) {
    const vn = (ms) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(ms));
    const cases = [{}, { streakCount: 4, lastPlayedDate: vn(now) }, { streakCount: 4, lastPlayedDate: vn(now - 86400e3) }, { streakCount: 4, lastPlayedDate: vn(now - 3 * 86400e3) }];
    for (const u of cases) {
      mock.timers.enable({ apis: ['Date'], now });
      const c = calculateStreak(u); mock.timers.reset();
      const s = E.streakUpdate(u, now);
      assert.deepStrictEqual({ streakCount: s.streakCount, lastPlayedDate: s.lastPlayedDate }, c, `now=${now} u=${JSON.stringify(u)}`);
    }
  }
});
test('streak: có streakRestorePending => +1 và xoá cờ', () => {
  const s = E.streakUpdate({ streakCount: 7, streakRestorePending: true, lastPlayedDate: '2000-01-01' }, T[1]);
  assert.strictEqual(s.streakCount, 8); assert.ok(s.clearPending);
});
test('khung giờ Đạo Hữu Bảng 4h–23h VN: server == client', () => {
  for (let h = 0; h < 48; h++) { const now = Date.UTC(2026, 10, 10, 0, 0) + h * 1800e3; assert.strictEqual(E.examWindowOpen(now), isExamPathWindowOpen(new Date(now)), 'ms=' + now); }
});
test('examDailyScore: kẹp 0.2 phút .. total*2 phút, làm tròn 0.1', () => {
  assert.strictEqual(E.examDailyScore(1000, 1000 + 1000, 10), 0.2);
  assert.strictEqual(E.examDailyScore(0, 90 * 60e3, 10), 20);
  assert.strictEqual(E.examDailyScore(0, 3.14159 * 60e3, 10), 3.1);
});
