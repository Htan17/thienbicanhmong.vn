import { ALEP_CONFIG as C } from './adaptiveConfig.js';

const dayKey = (ms) => Math.floor(ms / 86400000);

// attempts: các lượt của MỘT chủ đề, đã sắp theo thời gian.
// Độ tin cậy 0..1 = (số lượt hiệu dụng / mục tiêu) x hệ số đa dạng (ngày, độ khó, dạng câu).
// Lượt lặp dày đặc trong cùng 1 phiên bị giảm trọng số để không "cày" ra độ tin cậy cao.
export const computeConfidence = (attempts) => {
    if (!attempts || !attempts.length) return 0;
    const cf = C.confidence;
    const perSession = {};
    let eff = 0;
    const days = new Set(), diffs = new Set(), types = new Set();
    attempts.forEach(a => {
        const n = perSession[a.sessionId] = (perSession[a.sessionId] || 0) + 1;
        eff += n <= cf.sessionFirstCount ? cf.sessionFirstWeight : cf.sessionRepeatWeight;
        days.add(dayKey(a.at));
        if (a.difficultyKnown) diffs.add(a.difficulty);
        types.add(a.questionType);
    });
    const volume = Math.min(1, eff / cf.targetAttempts);
    const t = cf.diversityTargets;
    const div = (Math.min(1, days.size / t.days) + Math.min(1, diffs.size / t.difficulty) + Math.min(1, types.size / t.type)) / 3;
    const factor = cf.diversityMinFactor + (1 - cf.diversityMinFactor) * div;
    return Math.min(1, Math.max(0, volume * factor));
};
