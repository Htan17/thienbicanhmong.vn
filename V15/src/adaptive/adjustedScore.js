import { ALEP_CONFIG as C } from './adaptiveConfig.js';

// Điểm điều chỉnh 0..1 cho 1 lượt, tính từ tín hiệu thô (không đọc điểm có sẵn).
//  - Sai / bó tay: 0
//  - Đúng: điểm gốc theo số lần sai trước đó, trừ phạt nếu dùng gợi ý / giải thích AI trước khi trả lời.
export const adjustedScore = (a) => {
    if (!a || a.isCorrect !== true || a.gaveUp === true) return 0;
    const w = a.wrongAttempts || 0;
    const base = w <= 0 ? C.baseScore.correctFirstTry : w === 1 ? C.baseScore.correctAfterOneWrong : C.baseScore.correctAfterTwoWrong;
    const pen = (a.usedHint ? C.penalty.hint : 0) + (a.usedAiExplanation ? C.penalty.aiExplanation : 0);
    return Math.min(1, Math.max(0, base - pen));
};

export const difficultyWeight = (d) => C.difficultyWeight[d] || C.difficultyWeight[C.defaultDifficulty];
