// ALEP 0.1 - Adaptive Learning Path Engine (CHỈ ĐO LƯỜNG, không đổi lộ trình).
// Mọi hằng số nằm ở đây (có phiên bản) để báo cáo KHKT nêu rõ và có thể hiệu chỉnh sau,
// không rải số "ma thuật" trong code.
const deepFreeze = (o) => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

export const ALEP_CONFIG = deepFreeze({
    engineVersion: 'ALEP-0.1',
    configVersion: 'cfg1',
    schemaVersion: 1,
    // Điểm gốc theo số lần sai trước khi đúng (0 lần sai = đúng ngay lần đầu)
    baseScore: { correctFirstTry: 1.0, correctAfterOneWrong: 0.70, correctAfterTwoWrong: 0.45, incorrect: 0 },
    // Trừ điểm khi có hỗ trợ (chỉ áp cho câu đúng; tối thiểu 0)
    penalty: { hint: 0.10, aiExplanation: 0.15 },
    // Câu khó hơn ảnh hưởng mastery nhiều hơn một chút
    difficultyWeight: { 1: 0.9, 2: 1.0, 3: 1.08, 4: 1.15 },
    defaultDifficulty: 2,
    difficultyRange: [1, 4],
    mastery: {
        initial: 50,
        alphaLowConfidence: 0.35, // ít dữ liệu -> học nhanh hơn
        alphaNormal: 0.20,
        lowConfidenceBelow: 0.4,
        sessionCapUp: 20,   // tối đa +20 mastery / chủ đề / phiên (chống "cày" 1 phiên)
        sessionCapDown: 15  // tối đa -15
    },
    confidence: {
        targetAttempts: 12,
        sessionFirstWeight: 1.0, // 3 lần đầu của chủ đề trong 1 phiên tính đủ
        sessionFirstCount: 3,
        sessionRepeatWeight: 0.1, // các lần sau trong cùng phiên chỉ tính 0.1
        diversityTargets: { days: 3, difficulty: 2, type: 2 },
        diversityMinFactor: 0.6
    },
    forgetting: { // effectiveMastery = mastery * exp(-rate * ngày)
        rateHigh: 0.008, // mastery >= 80
        rateMid: 0.015,  // mastery >= 60
        rateLow: 0.025,
        highFrom: 80,
        midFrom: 60
    },
    status: {
        unassessedConfidenceBelow: 0.30,
        foundationBelow: 40,
        developingBelow: 65,
        nearMasteryBelow: 80,
        temporarilyMasteredFrom: 80,
        temporarilyMasteredConfidence: 0.65,
        reviewDueMasteryFrom: 65,
        reviewDueEffectiveBelow: 65
    },
    responseSecondsMax: 600,
    unclassifiedTopic: { id: 'unclassified', label: 'Chưa phân loại' },
    // Nhãn tạm do Đạo Lộ sinh ra khi AI lỗi/không có key -> KHÔNG phải chủ đề thật
    placeholderTopics: ['Tổng Quát', 'Chủ Đề Chung', 'Tổng Ôn'],
    storage: { maxAttemptsPerUser: 500, keyPrefix: 'alep01:' },
    // Phản hồi cho người học: nhận định chỉ về BẰNG CHỨNG học tập, không kết luận tính cách/năng lực chung
    explain: { minAttemptsForClaim: 3, recentWindow: 5 }
});
