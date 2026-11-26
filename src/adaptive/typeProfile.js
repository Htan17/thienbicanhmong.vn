// QUIZ ENGINE V2 – Phân tích khả năng của người học THEO TỪNG LOẠI CÂU. Thuần hàm, chỉ ĐO LƯỜNG (không đổi lộ trình).
// Không đánh đồng "đúng câu trắc nghiệm" với "đạt điểm tự luận":
//   single/truefalse/short -> tỉ lệ ĐÚNG (accuracy)
//   essay                  -> trung bình điểm AI GỢI Ý (chưa kiểm chứng), luôn tách riêng, KHÔNG gọi là accuracy.
import { normalizeAttempt } from './adaptiveTypes.js';
import { SECTION_DEFS } from '../quiz-v2/questionTypes.js';

const TYPES = ['single', 'truefalse', 'short', 'essay'];
export const buildTypeProfiles = (rawAttempts) => {
    const seen = new Set();
    const acc = Object.fromEntries(TYPES.map(t => [t, { questionType: t, attempts: 0, correct: 0, ratioSum: 0, ratioN: 0, suggestedSum: 0, suggestedN: 0, assisted: 0 }]));
    (Array.isArray(rawAttempts) ? rawAttempts : []).forEach(r => {
        const a = normalizeAttempt(r); if (!a) return;
        if (a.attemptId) { if (seen.has(a.attemptId)) return; seen.add(a.attemptId); }
        const x = acc[a.questionType]; if (!x) return;
        x.attempts++;
        if (a.usedHint || a.usedAiExplanation || a.gaveUp) x.assisted++;
        if (a.questionType === 'essay') { if (typeof a.suggestedRatio === 'number') { x.suggestedSum += a.suggestedRatio; x.suggestedN++; } return; }
        if (a.isCorrect && !a.gaveUp) x.correct++;
        if (a.questionType === 'truefalse' && typeof a.scoreRatio === 'number') { x.ratioSum += a.scoreRatio; x.ratioN++; }
    });
    const r3 = (v) => Math.round(v * 1000) / 1000;
    return TYPES.map(t => {
        const x = acc[t]; const sec = SECTION_DEFS.find(s => s.type === t);
        if (t === 'essay') return { questionType: t, sectionId: sec.id, attempts: x.attempts, accuracy: null, suggestedScoreAvg: x.suggestedN ? r3(x.suggestedSum / x.suggestedN) : null, scoreVerified: false, assisted: x.assisted };
        return { questionType: t, sectionId: sec.id, attempts: x.attempts, accuracy: x.attempts ? r3(x.correct / x.attempts) : null, ...(t === 'truefalse' ? { partialRatioAvg: x.ratioN ? r3(x.ratioSum / x.ratioN) : null } : {}), assisted: x.assisted };
    });
};
