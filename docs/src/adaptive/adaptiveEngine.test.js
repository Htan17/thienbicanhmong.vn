// Chạy: node --test src/adaptive/adaptiveEngine.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALEP_CONFIG as C } from './adaptiveConfig.js';
import { adjustedScore } from './adjustedScore.js';
import { computeConfidence } from './confidenceCalculator.js';
import { effectiveMastery, nextReviewAt, daysSince } from './forgettingModel.js';
import { buildProfiles } from './masteryCalculator.js';
import { normalizeAttempt, resolveTopic, uidHash } from './adaptiveTypes.js';
import { explainProfile } from './adaptiveExplain.js';
import { appendAttempts, loadAttempts, loadProfiles } from './adaptiveLocalStore.js';
import { createAdaptiveSession } from './adaptiveSession.js';

const DAY = 86400000, T0 = Date.UTC(2026, 10, 1, 8);
const mk = (o = {}) => ({ attemptId: `${o.sessionId || 's1'}:${o.seq || 0}`, sessionId: 's1', seq: 0, topicLabel: 'Đại Số', questionType: 'single', difficulty: 2, isCorrect: true, wrongAttempts: 0, at: T0, ...o });
const memStore = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };

test('1 điểm: đúng ngay lần đầu = 1', () => assert.equal(adjustedScore(normalizeAttempt(mk())), 1));
test('2 điểm: đúng sau 1 sai = 0.70, sau 2 sai = 0.45', () => {
    assert.equal(adjustedScore(normalizeAttempt(mk({ wrongAttempts: 1 }))), 0.70);
    assert.equal(adjustedScore(normalizeAttempt(mk({ wrongAttempts: 2 }))), 0.45);
});
test('3 gợi ý trừ 0.10, AI trừ 0.15, cộng dồn, không âm', () => {
    assert.ok(Math.abs(adjustedScore(normalizeAttempt(mk({ usedHint: true }))) - 0.9) < 1e-9);
    assert.ok(Math.abs(adjustedScore(normalizeAttempt(mk({ usedAiExplanation: true }))) - 0.85) < 1e-9);
    assert.equal(adjustedScore(normalizeAttempt(mk({ wrongAttempts: 2, usedHint: true, usedAiExplanation: true }))), 0.2);
});
test('4 sai hoặc bó tay = 0', () => {
    assert.equal(adjustedScore(normalizeAttempt(mk({ isCorrect: false }))), 0);
    assert.equal(adjustedScore(normalizeAttempt(mk({ isCorrect: true, gaveUp: true }))), 0);
});
test('5 không tin điểm gửi kèm: adjustedScore giả bị bỏ qua', () => {
    const a = normalizeAttempt({ ...mk({ isCorrect: false }), adjustedScore: 1, mastery: 100, role: 'admin' });
    assert.equal(adjustedScore(a), 0); assert.equal(a.role, undefined); assert.equal(a.mastery, undefined);
});
test('6 thiếu at hợp lệ -> bỏ lượt, không bịa', () => assert.equal(normalizeAttempt({ ...mk(), at: 0 }), null));
test('7 chủ đề nhãn tạm -> unclassified; chủ đề thật giữ nhãn', () => {
    assert.equal(resolveTopic('Tổng Quát').id, 'unclassified'); assert.equal(resolveTopic('').id, 'unclassified');
    assert.equal(resolveTopic('Đại Số 10').id, 'dai-so-10');
});
test('8 độ khó thiếu/ngoài khoảng -> mặc định 2 / kẹp 1..4', () => {
    assert.equal(normalizeAttempt(mk({ difficulty: undefined })).difficulty, 2);
    assert.equal(normalizeAttempt(mk({ difficulty: 99 })).difficulty, 4);
    assert.equal(normalizeAttempt(mk({ difficulty: -3 })).difficulty, 1);
});
test('9 responseSeconds bị kẹp 0..600', () => {
    assert.equal(normalizeAttempt(mk({ responseSeconds: 99999 })).responseSeconds, 600);
    assert.equal(normalizeAttempt(mk({ responseSeconds: -5 })).responseSeconds, 0);
});
test('10 dữ liệu ít -> độ tin cậy thấp, trạng thái unassessed', () => {
    const p = buildProfiles([mk()], T0)['dai-so'];
    assert.ok(p.confidence < 0.3); assert.equal(p.status, 'unassessed');
});
test('11 nhiều lượt, nhiều ngày/độ khó/dạng -> tin cậy cao', () => {
    const at = [];
    for (let d = 0; d < 4; d++) for (let i = 0; i < 4; i++) at.push(mk({ sessionId: `s${d}`, seq: i, at: T0 + d * DAY + i * 1000, difficulty: 1 + (i % 3), questionType: i % 2 ? 'multi' : 'single' }));
    const c = computeConfidence(at.map(normalizeAttempt));
    assert.ok(c > 0.8, `c=${c}`);
});
test('12 cày 1 phiên không đạt tin cậy cao', () => {
    const at = Array.from({ length: 30 }, (_, i) => mk({ seq: i, at: T0 + i * 1000 }));
    assert.ok(computeConfidence(at.map(normalizeAttempt)) < 0.5);
});
test('13 mastery tăng khi đúng liên tục, giảm khi sai', () => {
    const good = Array.from({ length: 6 }, (_, i) => mk({ sessionId: `g${i}`, seq: 0, at: T0 + i * DAY }));
    const bad = Array.from({ length: 6 }, (_, i) => mk({ sessionId: `b${i}`, seq: 0, at: T0 + i * DAY, isCorrect: false }));
    assert.ok(buildProfiles(good, T0 + 6 * DAY)['dai-so'].mastery > 70);
    assert.ok(buildProfiles(bad, T0 + 6 * DAY)['dai-so'].mastery < 30);
});
test('14 giới hạn thay đổi mastery trong 1 phiên (+20 / -15)', () => {
    const up = Array.from({ length: 20 }, (_, i) => mk({ seq: i, at: T0 + i * 1000 }));
    const dn = Array.from({ length: 20 }, (_, i) => mk({ seq: i, at: T0 + i * 1000, isCorrect: false }));
    assert.ok(buildProfiles(up, T0)['dai-so'].mastery <= C.mastery.initial + C.mastery.sessionCapUp + 0.11);
    assert.ok(buildProfiles(dn, T0)['dai-so'].mastery >= C.mastery.initial - C.mastery.sessionCapDown - 0.11);
});
test('15 suy giảm: 0 ngày giữ nguyên, nhiều ngày giảm, mastery cao giảm chậm hơn', () => {
    assert.equal(effectiveMastery(80, T0, T0), 80);
    assert.ok(effectiveMastery(80, T0, T0 + 30 * DAY) < 80);
    const hi = effectiveMastery(90, T0, T0 + 20 * DAY) / 90, lo = effectiveMastery(50, T0, T0 + 20 * DAY) / 50;
    assert.ok(hi > lo);
});
test('16 mốc luyện thiếu/không hợp lệ -> không suy giảm, không NaN; mốc tương lai -> 0 ngày', () => {
    assert.equal(effectiveMastery(70, undefined, T0), 70); assert.equal(effectiveMastery(70, 'x', T0), 70);
    assert.equal(daysSince(T0 + 5 * DAY, T0), 0);
    assert.ok(Number.isFinite(effectiveMastery(NaN, T0, T0)));
    assert.equal(nextReviewAt(70, null), null);
});
test('17 review_due: mastery cao nhưng lâu không luyện', () => {
    const at = []; for (let d = 0; d < 4; d++) for (let i = 0; i < 4; i++) at.push(mk({ sessionId: `s${d}`, seq: i, at: T0 + d * DAY + i * 1000, difficulty: 1 + (i % 3), questionType: i % 2 ? 'multi' : 'single' }));
    const fresh = buildProfiles(at, T0 + 4 * DAY)['dai-so'];
    const old = buildProfiles(at, T0 + 60 * DAY)['dai-so'];
    assert.ok(fresh.status === 'temporarily_mastered' || fresh.status === 'near_mastery', fresh.status);
    assert.equal(old.status, 'review_due'); assert.ok(old.effectiveMastery < old.mastery);
});
test('18 chống trùng attemptId', () => {
    const p = buildProfiles([mk(), mk()], T0)['dai-so']; assert.equal(p.attempts, 1);
});
test('19 giải thích: có bằng chứng, không kết luận tính cách; ít dữ liệu nói rõ', () => {
    const p = buildProfiles([mk()], T0)['dai-so']; const e = explainProfile(p, T0);
    assert.ok(e.reasons.includes('LOW_CONFIDENCE')); assert.match(e.lines.join(' '), /Chưa đủ dữ liệu/);
    assert.match(e.lines.join(' '), /không phải đánh giá năng lực hay tính cách/);
});
test('20 giải thích suy giảm có số ngày thật', () => {
    const at = []; for (let d = 0; d < 4; d++) for (let i = 0; i < 4; i++) at.push(mk({ sessionId: `s${d}`, seq: i, at: T0 + d * DAY + i * 1000, difficulty: 1 + (i % 3), questionType: i % 2 ? 'multi' : 'single' }));
    const p = buildProfiles(at, T0 + 60 * DAY)['dai-so']; const e = explainProfile(p, T0 + 60 * DAY);
    assert.ok(e.reasons.includes('FORGETTING_DECAY')); assert.match(e.lines.join(' '), /56 ngày/);
});
test('21 lưu cục bộ: ghi, đọc, chống trùng, giới hạn, khoá ẩn danh', () => {
    const st = memStore();
    assert.equal(appendAttempts('uid-abc', [mk()], st), true); appendAttempts('uid-abc', [mk()], st);
    assert.equal(loadAttempts('uid-abc', st).length, 1);
    assert.ok(Object.keys(st._m)[0].startsWith('alep01:HS-')); assert.ok(!Object.keys(st._m)[0].includes('uid-abc'));
    assert.ok(!JSON.stringify(st._m).includes('uid-abc'));
    assert.equal(Object.keys(loadProfiles('uid-abc', T0, st)).length, 1);
});
test('22 lưu cục bộ hỏng/không có storage không ném lỗi', () => {
    assert.deepEqual(loadAttempts('u', null), []); assert.equal(appendAttempts('u', [mk()], null), false);
    const bad = { getItem: () => '{not json', setItem: () => { throw new Error('quota'); } };
    assert.deepEqual(loadAttempts('u', bad), []); assert.equal(appendAttempts('u', [mk()], bad), false);
});
test('23 uidHash ổn định, dạng HS-XXXXXX, khác uid khác mã', () => {
    assert.match(uidHash('a'), /^HS-[0-9A-F]{6}$/); assert.equal(uidHash('a'), uidHash('a')); assert.notEqual(uidHash('a'), uidHash('b'));
});
test('24 session: ghi đúng cờ gợi ý/AI/bó tay và số lần sai; commit idempotent', () => {
    const st = memStore(); let t = T0; const s = createAdaptiveSession(() => (t += 5000));
    // commit dùng localStorage mặc định -> kiểm tra qua global giả
    globalThis.localStorage = st;
    s.begin();
    s.recordAnswer(0, { type: 'single', difficulty: 3 }, true, 0);
    s.flagHint(1); s.recordAnswer(1, { type: 'single' }, true, 1);
    s.flagGiveUp(2); s.recordAnswer(2, { type: 'single' }, false, 1);
    s.flagAi(3, false); s.recordAnswer(3, { type: 'numeric' }, true, 0);
    s.flagAi(4, true); s.recordAnswer(4, { type: 'single' }, true, 0); // xin AI sau khi đã trả lời: không phạt
    s.recordAnswer(5, { type: 'multi' }, false, 0);
    assert.equal(s.commit({ uid: 'u1', source: 'examPath', nodeType: 'lesson', nodeTopics: ['Hàm số'] }), true);
    const a = loadAttempts('u1', st);
    assert.equal(a.length, 6);
    assert.equal(a[0].wrongAttempts, 0); assert.equal(a[1].usedHint, true); assert.equal(a[1].wrongAttempts, 1);
    assert.equal(a[2].gaveUp, true); assert.equal(a[2].wrongAttempts, 1); assert.equal(a[3].usedAiExplanation, true);
    assert.equal(a[4].usedAiExplanation, false); assert.equal(a[5].wrongAttempts, 1);
    assert.ok(a.every(x => x.topicLabel === 'Hàm số' && x.source === 'examPath' && x.nodeType === 'lesson'));
    assert.equal(s.commit({ uid: 'u1' }), false); // không có gì để ghi nữa
    delete globalThis.localStorage;
});
test('25 session: Ải nhiều chủ đề hoặc nhãn tạm -> unclassified; lỗi trong engine không ném ra', () => {
    const st = memStore(); globalThis.localStorage = st; const s = createAdaptiveSession();
    s.begin(); s.recordAnswer(0, { type: 'single' }, true, 0);
    s.commit({ uid: 'u2', source: 'quiz', nodeTopics: ['A', 'B'] });
    assert.equal(loadAttempts('u2', st)[0].topicId, 'unclassified');
    assert.doesNotThrow(() => { s.recordAnswer(0, null, true, 0); s.commit(undefined); s.flagHint(); });
    delete globalThis.localStorage;
});
