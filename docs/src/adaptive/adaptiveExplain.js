import { ALEP_CONFIG as C } from './adaptiveConfig.js';

// Giải thích "Vì sao hệ thống đánh giá như vậy?" - CHỈ dựa trên bằng chứng cụ thể trong dữ liệu,
// không kết luận về tính cách / năng lực chung. Trả về { reasons: [mã], lines: [câu] }.
export const explainProfile = (p, now = Date.now()) => {
    const reasons = [], lines = [];
    const e = C.explain, s = C.status;
    const days = p.lastPracticedAt ? Math.max(0, Math.floor((now - p.lastPracticedAt) / 86400000)) : null;

    lines.push(`Dựa trên ${p.attempts} lượt làm câu thuộc chủ đề này (${p.correctFirstTry} đúng ngay lần đầu không cần hỗ trợ, ${p.assistedCorrect} đúng nhưng có sai trước/gợi ý, ${p.incorrect} sai).`);

    if (p.confidence < s.unassessedConfidenceBelow) {
        reasons.push('LOW_CONFIDENCE');
        lines.push(`Chưa đủ dữ liệu để kết luận: độ tin cậy ${Math.round(p.confidence * 100)}% (cần nhiều lượt hơn, ở nhiều ngày / mức khó / dạng câu khác nhau).`);
    } else if (p.confidence < s.temporarilyMasteredConfidence) {
        reasons.push('LOW_CONFIDENCE');
        lines.push(`Độ tin cậy mới ${Math.round(p.confidence * 100)}%, nên hệ thống chưa dám kết luận "đã nắm vững".`);
    }
    if (p.mastery >= s.reviewDueMasteryFrom && p.effectiveMastery < s.reviewDueEffectiveBelow) {
        reasons.push('LOW_EFFECTIVE_MASTERY'); reasons.push('FORGETTING_DECAY');
        lines.push(`Mức nắm vững ghi nhận ${Math.round(p.mastery)}%, nhưng đã ${days} ngày chưa luyện nên mức nắm vững hiệu lực giảm còn ${Math.round(p.effectiveMastery)}% (ước tính theo mô hình suy giảm trí nhớ).`);
    } else if (days != null && days >= 3 && p.effectiveMastery < p.mastery - 2) {
        reasons.push('FORGETTING_DECAY');
        lines.push(`Đã ${days} ngày chưa luyện nên mức hiệu lực (${Math.round(p.effectiveMastery)}%) thấp hơn mức ghi nhận (${Math.round(p.mastery)}%).`);
    }
    if (p.attempts >= e.minAttemptsForClaim) {
        if ((p.hintCount + p.aiExplanationCount) / p.attempts >= 0.4) {
            reasons.push('HINT_DEPENDENCY');
            lines.push(`Trong ${p.attempts} lượt có ${p.hintCount} lần xin gợi ý và ${p.aiExplanationCount} lần xem giải thích AI trước khi trả lời, nên điểm các câu đó bị trừ.`);
        }
        const recent = p.recentAttempts || [];
        const wrong = recent.filter(r => !r.isCorrect).length;
        if (recent.length >= e.minAttemptsForClaim && wrong >= Math.ceil(recent.length / 2)) {
            reasons.push('RECENT_FAILURES');
            lines.push(`${wrong}/${recent.length} lượt gần nhất làm sai.`);
        }
    }
    lines.push('Đây là ước lượng từ dữ liệu làm bài, không phải đánh giá năng lực hay tính cách của bạn.');
    return { reasons, lines };
};
