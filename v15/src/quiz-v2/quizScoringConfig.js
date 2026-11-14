// QUIZ ENGINE V2 – CẤU HÌNH CHẤM ĐIỂM TẬP TRUNG. UI KHÔNG được hard-code trọng số: mọi con số nằm ở đây (có phiên bản).
// Mỗi Bí Tịch có thể mang cấu hình riêng ở trường `scoring` (bị gộp lên cấu hình mặc định); câu hỏi có thể ghi đè bằng `points`/`maxScore`.
import { SECTION_DEFS, SECTION_BY_ID, isTrueFalseType, isEssayType, isShortType, normalizeType, sectionOf } from './questionTypes.js';

const deepFreeze = (o) => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

export const QUIZ_SCORING_CONFIG = deepFreeze({
    version: 'qscore-1',
    // Điểm tối đa mỗi câu theo phần (đổi ở đây, không đổi ở UI)
    sections: {
        multiple_choice: { pointsPerQuestion: 1 },
        true_false: { pointsPerQuestion: 1, mode: 'perStatement' }, // 'perStatement' = tỉ lệ số ý đúng | 'allOrNothing' | 'table' (dùng bảng ratioTable)
        short_answer: { pointsPerQuestion: 1 },
        essay: { pointsPerQuestion: 1 }                              // maxScore của câu tự luận (nếu có) được ưu tiên
    },
    // Bảng tỉ lệ theo số ý đúng (chỉ dùng khi mode = 'table'): 0 ý->0, 1 ý->10%, 2 ý->25%, 3 ý->50%, 4 ý->100%
    ratioTable: { 0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1 },
    // Điểm AI chấm tự luận chỉ là GỢI Ý: không cộng vào tổng chính thức, không đưa vào dữ liệu nghiên cứu cho tới khi được kiểm chứng.
    essay: { aiScoreIsOfficial: false, includeSuggestedInGrandTotal: false }
});

// Ví dụ cấu hình theo cấu trúc đề tham khảo (chỉ là một PRESET để chọn khi cần, không dùng mặc định)
export const SCORING_PRESET_TABLE = deepFreeze({
    sections: {
        multiple_choice: { pointsPerQuestion: 0.25 },
        true_false: { pointsPerQuestion: 1, mode: 'table' },
        short_answer: { pointsPerQuestion: 0.5 },
        essay: { pointsPerQuestion: 1 }
    }
});

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
// Gộp cấu hình của Bí Tịch (nếu có) lên mặc định. Không tin giá trị lạ: sai kiểu -> dùng mặc định.
export const resolveScoringConfig = (override) => {
    const base = QUIZ_SCORING_CONFIG; const o = override && typeof override === 'object' ? override : {};
    const sections = {};
    SECTION_DEFS.forEach(s => {
        const b = base.sections[s.id]; const x = (o.sections && o.sections[s.id]) || {};
        const mode = ['perStatement', 'allOrNothing', 'table'].includes(x.mode) ? x.mode : b.mode;
        sections[s.id] = { pointsPerQuestion: num(x.pointsPerQuestion, b.pointsPerQuestion), ...(mode ? { mode } : {}) };
    });
    const ratioTable = { ...base.ratioTable }; if (o.ratioTable && typeof o.ratioTable === 'object') Object.keys(o.ratioTable).forEach(k => { const v = Number(o.ratioTable[k]); if (v >= 0 && v <= 1) ratioTable[k] = v; });
    return { version: base.version, sections, ratioTable, essay: { ...base.essay } };
};

// Điểm tối đa của 1 câu
export const maxScoreOf = (q, cfg) => {
    const c = cfg || resolveScoringConfig();
    const sid = sectionOf(q);
    if (isEssayType(q && q.type) && typeof q.maxScore === 'number' && q.maxScore > 0) return q.maxScore;
    if (q && typeof q.points === 'number' && q.points > 0) return q.points;
    return (c.sections[sid] || c.sections.multiple_choice).pointsPerQuestion;
};

// Tỉ lệ đúng của câu Đúng/Sai theo cấu hình (0..1)
export const truefalseRatio = (correctCount, total, cfg) => {
    const c = cfg || resolveScoringConfig();
    if (!(total > 0)) return 0;
    const mode = (c.sections.true_false || {}).mode || 'perStatement';
    if (mode === 'allOrNothing') return correctCount === total ? 1 : 0;
    if (mode === 'table' && total === 4 && c.ratioTable[correctCount] != null) return c.ratioTable[correctCount];
    return correctCount / total; // perStatement (và 'table' khi số ý khác 4)
};

// result: { correct?:boolean, correctCount?:number, total?:number, suggestedScore?:number }
// Trả { sectionId, type, score, maxScore, official } ; essay: score = điểm GỢI Ý, official=false.
export const scoreQuestion = (q, result, cfg) => {
    const c = cfg || resolveScoringConfig();
    const type = normalizeType(q && q.type); const sectionId = sectionOf(q); const maxScore = maxScoreOf(q, c);
    const r = result || {};
    if (type === 'essay') {
        const s = typeof r.suggestedScore === 'number' && Number.isFinite(r.suggestedScore) ? Math.min(maxScore, Math.max(0, r.suggestedScore)) : null;
        return { sectionId, type, score: s, maxScore, official: false, pending: s == null };
    }
    if (type === 'truefalse') {
        const total = Number.isInteger(r.total) ? r.total : ((q && q.o) || []).length;
        const cc = Number.isInteger(r.correctCount) ? r.correctCount : (r.correct ? total : 0);
        return { sectionId, type, score: Math.round(maxScore * truefalseRatio(cc, total, c) * 1000) / 1000, maxScore, official: true, pending: false };
    }
    return { sectionId, type, score: r.correct ? maxScore : 0, maxScore, official: true, pending: false };
};

// entries: mảng kết quả từ scoreQuestion (theo thứ tự làm). Trả tổng kết từng phần + tổng.
export const summarizeScores = (entries, cfg) => {
    const c = cfg || resolveScoringConfig();
    const parts = SECTION_DEFS.map(s => ({ id: s.id, title: s.title, shortTitle: s.shortTitle, type: s.type, count: 0, answered: 0, score: 0, max: 0, official: s.type !== 'essay', pendingCount: 0 }));
    const byId = Object.fromEntries(parts.map(p => [p.id, p]));
    (entries || []).forEach(e => {
        if (!e) return; const p = byId[e.sectionId]; if (!p) return;
        p.count++; p.max += e.maxScore;
        if (e.pending) p.pendingCount++; else { p.answered++; p.score += e.score; }
    });
    parts.forEach(p => { p.score = Math.round(p.score * 1000) / 1000; p.max = Math.round(p.max * 1000) / 1000; });
    const used = parts.filter(p => p.count > 0);
    const off = used.filter(p => p.official);
    const totalOfficial = { score: Math.round(off.reduce((a, p) => a + p.score, 0) * 1000) / 1000, max: Math.round(off.reduce((a, p) => a + p.max, 0) * 1000) / 1000 };
    const sug = used.filter(p => !p.official);
    const suggested = { score: Math.round(sug.reduce((a, p) => a + p.score, 0) * 1000) / 1000, max: Math.round(sug.reduce((a, p) => a + p.max, 0) * 1000) / 1000, pendingCount: sug.reduce((a, p) => a + p.pendingCount, 0) };
    const grand = c.essay.includeSuggestedInGrandTotal ? { score: totalOfficial.score + suggested.score, max: totalOfficial.max + suggested.max } : totalOfficial;
    return { parts: used, totalOfficial, suggestedEssay: suggested, grandTotal: grand, configVersion: c.version };
};
export { SECTION_BY_ID, isTrueFalseType, isShortType };
