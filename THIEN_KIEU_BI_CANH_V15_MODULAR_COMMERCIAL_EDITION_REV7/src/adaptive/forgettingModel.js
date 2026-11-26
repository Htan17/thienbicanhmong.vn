import { ALEP_CONFIG as C } from './adaptiveConfig.js';

const DAY = 86400000;
export const decayRate = (mastery) => {
    const f = C.forgetting;
    return mastery >= f.highFrom ? f.rateHigh : mastery >= f.midFrom ? f.rateMid : f.rateLow;
};

// Số ngày kể từ lần luyện cuối. Thiếu/không hợp lệ -> null (không bịa). Mốc ở tương lai (lệch đồng hồ) -> 0.
export const daysSince = (lastPracticedAt, now) => {
    if (typeof lastPracticedAt !== 'number' || !Number.isFinite(lastPracticedAt) || lastPracticedAt <= 0) return null;
    return Math.max(0, (now - lastPracticedAt) / DAY);
};

// effectiveMastery = mastery * exp(-rate * ngày). Thiếu mốc luyện -> không áp suy giảm (trả nguyên mastery).
export const effectiveMastery = (mastery, lastPracticedAt, now) => {
    const m = typeof mastery === 'number' && Number.isFinite(mastery) ? Math.min(100, Math.max(0, mastery)) : 0;
    const d = daysSince(lastPracticedAt, now);
    if (d == null) return m;
    return m * Math.exp(-decayRate(m) * d);
};

// Thời điểm mà effectiveMastery rơi xuống ngưỡng ôn tập. Mastery chưa tới ngưỡng -> gợi ý ôn sau 1 ngày.
export const nextReviewAt = (mastery, lastPracticedAt) => {
    if (typeof lastPracticedAt !== 'number' || !(lastPracticedAt > 0)) return null;
    const th = C.status.reviewDueEffectiveBelow;
    if (!(mastery > th)) return lastPracticedAt + DAY;
    const days = Math.log(mastery / th) / decayRate(mastery);
    return Math.round(lastPracticedAt + days * DAY);
};
