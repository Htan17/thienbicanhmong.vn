import { ALEP_CONFIG as C } from './adaptiveConfig.js';
import { resolveTopic } from './adaptiveTypes.js';
import { appendAttempts } from './adaptiveLocalStore.js';

// Bộ ghi nhận trong 1 phiên làm quiz. Tách riêng để App.jsx chỉ cần vài dòng gọi (không chứa logic engine).
// Mọi hàm công khai đều bọc try/catch: engine lỗi thì quiz / thưởng / Đạo Lộ vẫn chạy bình thường.
export const createAdaptiveSession = (now = () => Date.now()) => {
    let sessionId = '', qs = {}, results = [], qStart = 0;
    const safe = (fn) => { try { return fn(); } catch (e) { try { console.warn('[ALEP]', e); } catch (_) {} } };
    const q = (i) => (qs[i] = qs[i] || { usedHint: false, usedAi: false, gaveUp: false });
    return {
        // Gọi khi bắt đầu một bộ câu (startFreshQuiz)
        begin: () => safe(() => { sessionId = `s${now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; qs = {}; results = []; qStart = now(); }),
        // Gọi khi sang câu kế (continueAfterAnswer, nhánh chưa phải câu cuối)
        nextQuestion: () => safe(() => { qStart = now(); }),
        flagHint: (i) => safe(() => { q(i).usedHint = true; }),
        flagGiveUp: (i) => safe(() => { q(i).gaveUp = true; }),
        // Giải thích AI chỉ tính là "phụ thuộc" nếu xin TRƯỚC khi trả lời (showExplanation=false); xin sau khi đã trả lời không phạt.
        flagAi: (i, alreadyAnswered) => safe(() => { if (!alreadyAnswered) q(i).usedAi = true; }),
        // Gọi trong finalizeAnswer. eliminatedCount = số lựa chọn sai đã bị loại (state của React, có thể lệch 1 ở lần sai cuối).
        // extra (tùy chọn, QUIZ ENGINE V2): { ratio } tỉ lệ đúng 0..1 (Đúng/Sai theo ý) | { essay:{ suggestedRatio } } điểm AI gợi ý (chưa kiểm chứng)
        recordAnswer: (i, question, isCorrect, eliminatedCount, extra) => safe(() => {
            if (!sessionId) return;
            const f = q(i);
            let wrong = Math.max(0, eliminatedCount || 0);
            if (!isCorrect && !f.gaveUp) wrong += 1; // lần sai cuối cùng chưa kịp vào state
            const rec = {
                attemptId: `${sessionId}:${i}`, sessionId, seq: i,
                questionType: question && question.type, sectionId: question && question.sectionId, difficulty: question && question.difficulty,
                ...(extra && typeof extra.ratio === 'number' ? { scoreRatio: extra.ratio } : {}),
                ...(extra && extra.essay ? { suggestedRatio: extra.essay.suggestedRatio, scoreVerified: false } : {}),
                topicLabel: question && (question.topic || question.subject || question.topicLabel),
                isCorrect: !!isCorrect, wrongAttempts: isCorrect ? wrong : Math.max(wrong, 1),
                usedHint: f.usedHint, usedAiExplanation: f.usedAi, gaveUp: f.gaveUp,
                responseSeconds: (now() - qStart) / 1000, at: now()
            };
            results = results.filter(r => r.seq !== i).concat(rec); // ghi lại cùng câu thì thay, không nhân đôi
        }),
        // Gọi sau khi đã tính thưởng / cập nhật Đạo Lộ ở câu cuối. nodeTopics: topics của Ải (nếu có).
        commit: ({ uid, source, nodeType, nodeTopics } = {}) => safe(() => {
            if (!uid || !results.length) return false;
            const real = (Array.isArray(nodeTopics) ? nodeTopics : []).filter(t => t && !C.placeholderTopics.includes(String(t).trim()));
            const nodeLabel = real.length === 1 ? real[0] : null; // nhiều chủ đề trong 1 Ải -> không đoán chủ đề cho từng câu
            const recs = results.map(r => ({ ...r, source: source === 'examPath' ? 'examPath' : 'quiz', nodeType: nodeType || null,
                topicLabel: resolveTopic(r.topicLabel || nodeLabel).label }));
            const ok = appendAttempts(uid, recs);
            results = [];
            return ok;
        })
    };
};
