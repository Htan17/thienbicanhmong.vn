import { ALEP_CONFIG as C } from './adaptiveConfig.js';
import { normalizeType, sectionOf, SECTION_BY_ID } from '../quiz-v2/questionTypes.js'; // QUIZ ENGINE V2: loại câu + phần

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// "Đại Số 10" -> "dai-so-10" (bỏ dấu, thường hoá) để cùng 1 chủ đề luôn ra cùng 1 id
export const slugifyTopic = (label) => {
    const s = String(label == null ? '' : label).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || C.unclassifiedTopic.id;
};

// Chủ đề thật hay nhãn tạm? Nhãn tạm / rỗng -> 'unclassified'
export const resolveTopic = (label) => {
    const t = String(label == null ? '' : label).trim();
    if (!t || t === C.unclassifiedTopic.label || C.placeholderTopics.includes(t)) return { id: C.unclassifiedTopic.id, label: C.unclassifiedTopic.label };
    return { id: slugifyTopic(t), label: t };
};

// Mã ẩn danh HS-XXXXXX (FNV-1a) - dùng làm khoá lưu cục bộ, KHÔNG lưu uid/email/tên
export const uidHash = (uid) => {
    let h = 0x811c9dc5; const s = `alep:${String(uid || '')}`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'HS-' + h.toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
};

// Chuẩn hoá 1 lượt làm: chỉ giữ trường cho phép, ép kiểu, KHÔNG tin điểm/mastery/role do nơi khác gửi.
// Điểm điều chỉnh (adjustedScore) luôn được TÍNH LẠI từ tín hiệu thô.
export const normalizeAttempt = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const topic = resolveTopic(raw.topicLabel != null ? raw.topicLabel : raw.topicId);
    const [dMin, dMax] = C.difficultyRange;
    const at = num(raw.at, 0);
    if (!(at > 0)) return null; // không có mốc thời gian hợp lệ -> bỏ, không bịa
    const diff = Math.round(num(raw.difficulty, C.defaultDifficulty));
    const qType = normalizeType(raw.questionType);
    return {
        attemptId: String(raw.attemptId || ''),
        sessionId: String(raw.sessionId || ''),
        seq: Math.max(0, Math.round(num(raw.seq, 0))),
        source: raw.source === 'examPath' ? 'examPath' : 'quiz',
        nodeType: ['lesson', 'review', 'boss'].includes(raw.nodeType) ? raw.nodeType : null,
        topicId: topic.id,
        topicLabel: topic.label,
        // QUIZ ENGINE V2: ghi theo tên V2 (single | truefalse | short | essay). Dữ liệu cũ 'multi' -> truefalse, 'numeric' -> short (legacyType giữ tên cũ).
        questionType: qType,
        ...(raw.questionType === 'multi' || raw.questionType === 'numeric' ? { legacyType: raw.questionType } : {}),
        sectionId: (typeof raw.sectionId === 'string' && SECTION_BY_ID[raw.sectionId]) ? raw.sectionId : sectionOf({ type: qType }),
        // Tự luận KHÔNG phải câu đúng/sai: không đưa vào mastery. Điểm AI chỉ là gợi ý, chưa kiểm chứng.
        objective: qType !== 'essay',
        ...(qType === 'truefalse' && raw.scoreRatio != null ? { scoreRatio: clamp(num(raw.scoreRatio, 0), 0, 1) } : {}),
        ...(qType === 'essay' ? { suggestedRatio: raw.suggestedRatio == null ? null : clamp(num(raw.suggestedRatio, 0), 0, 1), scoreVerified: raw.scoreVerified === true } : {}),
        difficulty: clamp(diff, dMin, dMax),
        difficultyKnown: raw.difficulty != null && Number.isFinite(Number(raw.difficulty)),
        isCorrect: qType === 'essay' ? false : raw.isCorrect === true,
        wrongAttempts: clamp(Math.round(num(raw.wrongAttempts, raw.isCorrect === true ? 0 : 1)), 0, 10),
        usedHint: raw.usedHint === true,
        usedAiExplanation: raw.usedAiExplanation === true,
        gaveUp: raw.gaveUp === true,
        responseSeconds: clamp(num(raw.responseSeconds, 0), 0, C.responseSecondsMax),
        at,
        engineVersion: C.engineVersion,
        schemaVersion: C.schemaVersion
    };
};
