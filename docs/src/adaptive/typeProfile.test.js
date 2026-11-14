// Chạy: node --test src/adaptive/typeProfile.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTypeProfiles } from './typeProfile.js';
import { buildProfiles } from './masteryCalculator.js';
import { normalizeAttempt } from './adaptiveTypes.js';

const T0 = Date.UTC(2026, 10, 1); const DAY = 86400000;
const mk = (o) => ({ attemptId: `${o.sessionId || 's'}:${o.seq}`, sessionId: 's', topicLabel: 'Đại Số', difficulty: 2, isCorrect: true, wrongAttempts: 0, usedHint: false, usedAiExplanation: false, gaveUp: false, responseSeconds: 5, at: T0 + o.seq * 1000, ...o });

test('normalizeAttempt: tên V2, legacy giữ legacyType, sectionId, essay không đúng/sai', () => {
    assert.equal(normalizeAttempt(mk({ seq: 1, questionType: 'multi' })).questionType, 'truefalse');
    assert.equal(normalizeAttempt(mk({ seq: 1, questionType: 'multi' })).legacyType, 'multi');
    assert.equal(normalizeAttempt(mk({ seq: 2, questionType: 'numeric' })).questionType, 'short');
    assert.equal(normalizeAttempt(mk({ seq: 3, questionType: 'single' })).sectionId, 'multiple_choice');
    assert.equal(normalizeAttempt(mk({ seq: 4, questionType: 'truefalse', sectionId: 'true_false' })).sectionId, 'true_false');
    assert.equal(normalizeAttempt(mk({ seq: 5, questionType: 'short', sectionId: 'bậy' })).sectionId, 'short_answer');
    const e = normalizeAttempt(mk({ seq: 6, questionType: 'essay', isCorrect: true, suggestedRatio: 0.7 }));
    assert.equal(e.isCorrect, false); assert.equal(e.objective, false); assert.equal(e.suggestedRatio, 0.7); assert.equal(e.scoreVerified, false);
    assert.equal(normalizeAttempt(mk({ seq: 7, questionType: 'lạ' })).questionType, 'single');
});

test('essay KHÔNG làm đổi mastery; câu khách quan vẫn tính', () => {
    const base = []; for (let i = 0; i < 6; i++) base.push(mk({ seq: i, questionType: 'single', at: T0 + i * 1000 }));
    const withEssay = [...base, mk({ seq: 10, questionType: 'essay', isCorrect: false, suggestedRatio: 0.1 }), mk({ seq: 11, questionType: 'essay', suggestedRatio: 0.2 })];
    const a = buildProfiles(base, T0 + DAY), b = buildProfiles(withEssay, T0 + DAY);
    assert.deepEqual(b, a);                       // y hệt: tự luận không ảnh hưởng mastery
    const only = buildProfiles([mk({ seq: 1, questionType: 'essay', suggestedRatio: 1 })], T0 + DAY);
    assert.deepEqual(only, {});                   // chỉ có tự luận -> chưa có hồ sơ mastery
});

test('buildTypeProfiles: tách theo loại, essay là điểm gợi ý riêng', () => {
    const at = [
        mk({ seq: 1, questionType: 'single' }), mk({ seq: 2, questionType: 'single', isCorrect: false }),
        mk({ seq: 3, questionType: 'multi', scoreRatio: 0.75, isCorrect: false }), mk({ seq: 4, questionType: 'truefalse', scoreRatio: 1 }),
        mk({ seq: 5, questionType: 'numeric' }), mk({ seq: 6, questionType: 'short', gaveUp: true, isCorrect: false }),
        mk({ seq: 7, questionType: 'essay', suggestedRatio: 0.5 }), mk({ seq: 8, questionType: 'essay', suggestedRatio: 0.9 }),
        mk({ seq: 1, questionType: 'single' }) // trùng attemptId -> bỏ
    ];
    const p = Object.fromEntries(buildTypeProfiles(at).map(x => [x.questionType, x]));
    assert.equal(p.single.attempts, 2); assert.equal(p.single.accuracy, 0.5);
    assert.equal(p.truefalse.attempts, 2); assert.equal(p.truefalse.accuracy, 0.5); assert.equal(p.truefalse.partialRatioAvg, 0.875);
    assert.equal(p.short.attempts, 2); assert.equal(p.short.accuracy, 0.5); assert.equal(p.short.assisted, 1);
    assert.equal(p.essay.attempts, 2); assert.equal(p.essay.accuracy, null); assert.equal(p.essay.suggestedScoreAvg, 0.7); assert.equal(p.essay.scoreVerified, false);
    assert.deepEqual(buildTypeProfiles(null).map(x => x.attempts), [0, 0, 0, 0]);
});
