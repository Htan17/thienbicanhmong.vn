import { ALEP_CONFIG as C } from './adaptiveConfig.js';
import { normalizeAttempt } from './adaptiveTypes.js';
import { adjustedScore, difficultyWeight } from './adjustedScore.js';
import { computeConfidence } from './confidenceCalculator.js';
import { effectiveMastery, nextReviewAt } from './forgettingModel.js';

export const computeStatus = (mastery, effective, confidence) => {
    const s = C.status;
    if (confidence < s.unassessedConfidenceBelow) return 'unassessed';
    if (mastery >= s.reviewDueMasteryFrom && effective < s.reviewDueEffectiveBelow) return 'review_due';
    if (mastery >= s.temporarilyMasteredFrom && confidence >= s.temporarilyMasteredConfidence) return 'temporarily_mastered';
    if (mastery < s.foundationBelow) return 'foundation';
    if (mastery < s.developingBelow) return 'developing';
    if (mastery < s.nearMasteryBelow) return 'near_mastery';
    return 'near_mastery'; // mastery cao nhưng chưa đủ độ tin cậy -> chưa dám gọi là đã nắm
};

// Phát lại các lượt của MỘT chủ đề để ra hồ sơ. Thuần hàm: cùng đầu vào + cùng `now` -> cùng kết quả.
const buildTopic = (topicId, attempts, now) => {
    attempts.sort((a, b) => a.at - b.at || a.seq - b.seq);
    let mastery = C.mastery.initial;
    const sessionDelta = {};
    let correctFirstTry = 0, assistedCorrect = 0, incorrect = 0, consecCorrect = 0, consecWrong = 0, hintCount = 0, aiCount = 0;
    attempts.forEach((a, i) => {
        const score = adjustedScore(a);
        const conf = computeConfidence(attempts.slice(0, i + 1));
        const alpha = (conf < C.mastery.lowConfidenceBelow ? C.mastery.alphaLowConfidence : C.mastery.alphaNormal) * difficultyWeight(a.difficulty);
        let delta = alpha * (score * 100 - mastery);
        const used = sessionDelta[a.sessionId] || 0;
        const capped = Math.min(C.mastery.sessionCapUp - used, Math.max(-C.mastery.sessionCapDown - used, delta));
        sessionDelta[a.sessionId] = used + capped;
        mastery = Math.min(100, Math.max(0, mastery + capped));
        if (a.isCorrect && !a.gaveUp) {
            if (a.wrongAttempts === 0 && !a.usedHint && !a.usedAiExplanation) correctFirstTry++; else assistedCorrect++;
            consecCorrect++; consecWrong = 0;
        } else { incorrect++; consecWrong++; consecCorrect = 0; }
        if (a.usedHint) hintCount++;
        if (a.usedAiExplanation) aiCount++;
    });
    const last = attempts[attempts.length - 1];
    const confidence = computeConfidence(attempts);
    const eff = effectiveMastery(mastery, last.at, now);
    return {
        topicId, topicLabel: last.topicLabel,
        mastery: Math.round(mastery * 10) / 10,
        effectiveMastery: Math.round(eff * 10) / 10,
        confidence: Math.round(confidence * 100) / 100,
        status: computeStatus(mastery, eff, confidence),
        attempts: attempts.length,
        correctFirstTry, assistedCorrect, incorrect,
        consecutiveCorrect: consecCorrect, consecutiveWrong: consecWrong,
        hintCount, aiExplanationCount: aiCount,
        recentAttempts: attempts.slice(-C.explain.recentWindow).map(x => ({ isCorrect: x.isCorrect && !x.gaveUp, assisted: x.usedHint || x.usedAiExplanation || x.wrongAttempts > 0 })),
        lastPracticedAt: last.at,
        nextReviewAt: nextReviewAt(mastery, last.at),
        engineVersion: C.engineVersion, schemaVersion: C.schemaVersion
    };
};

// rawAttempts: mảng lượt thô (có thể bẩn). Trả về { [topicId]: profile }.
export const buildProfiles = (rawAttempts, now = Date.now()) => {
    const seen = new Set(); const byTopic = {};
    (Array.isArray(rawAttempts) ? rawAttempts : []).forEach(r => {
        const a = normalizeAttempt(r);
        if (!a) return;
        if (a.attemptId) { if (seen.has(a.attemptId)) return; seen.add(a.attemptId); } // chống ghi trùng
        (byTopic[a.topicId] = byTopic[a.topicId] || []).push(a);
    });
    const out = {};
    Object.keys(byTopic).forEach(id => { out[id] = buildTopic(id, byTopic[id], now); });
    return out;
};
