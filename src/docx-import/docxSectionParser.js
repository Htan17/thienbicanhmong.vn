// QUIZ ENGINE V2 – Nhận diện PHẦN I–IV trong DOCX + dựng câu Trả lời ngắn / Tự luận + đổi tên loại cũ sang V2. THUẦN HÀM, không AI, không Firestore.
// Tiêu đề phần là TÍN HIỆU MẠNH NHẤT để biết loại câu (không chỉ dựa vào regex dòng "Đáp án"). Không có tiêu đề phần -> parser hiện tại + heuristic + requiresReview.
import { extractStructure, refineQuestion } from './docxTypeDetector.js';
import { SECTION_DEFS, SECTION_BY_ID, sectionIdForType, parseNumber } from '../quiz-v2/questionTypes.js';
import { normalizeRubric } from '../quiz-v2/essayRubric.js';

const ROMAN = { '1': 'multiple_choice', 'i': 'multiple_choice', '2': 'true_false', 'ii': 'true_false', '3': 'short_answer', 'iii': 'short_answer', '4': 'essay', 'iv': 'essay' };
const HEADER = /^\s*(?:ph[aầ]n|part)\s+(iv|iii|ii|i|[1-4])(?![a-zà-ỹ\d])\s*[.:\-–—)]?\s*(.*)$/iu;

// "PHẦN II. ĐÚNG / SAI ..." -> 'true_false' | null. Từ khóa trong tiêu đề ưu tiên hơn số La Mã (đề có thể đánh số khác).
export const detectSectionHeader = (text) => {
    const m = String(text || '').trim().match(HEADER); if (!m) return null;
    const rest = (m[2] || '').toLowerCase();
    if (/(đúng\s*[\/\-]?\s*sai|dung\s*[\/\-]?\s*sai)/u.test(rest)) return 'true_false';
    if (/(trả lời ngắn|tra loi ngan|điền số|điền đáp số|điền khuyết)/u.test(rest)) return 'short_answer';
    if (/(tự luận|tu luan)/u.test(rest)) return 'essay';
    if (/trắc nghiệm|trac nghiem|nhiều lựa chọn|nhiều phương án/u.test(rest)) return 'multiple_choice';
    return ROMAN[m[1].toLowerCase()] || null;
};

const QPREFIX = /^(Câu|Bài|Q)\s*\d+[\.\:\s\-]*/i;
const ANS = /^(Đáp án|DA)\s*[:：.]?\s*/iu;
const toNumStr = (s) => String(s).replace(/[=\s]/g, '').replace(',', '.');
const isPlainNumber = (s) => /^[=\s]*-?\d+(?:[.,]\d+)?\s*$/.test(String(s || ''));
const numPart = (s) => { const m = String(s || '').match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; };

// ---- Tự luận ----
const RUBRIC_MK = /^(rubric|tiêu chí chấm|tiêu chí|hướng dẫn chấm|biểu điểm)\s*[:：]?\s*(.*)$/iu;
const SAMPLE_MK = /^(đáp án mẫu|bài mẫu|bài giải mẫu|lời giải mẫu|gợi ý đáp án|đáp án)\s*[:：]?\s*(.*)$/iu;
const MAX_MK = /^(điểm tối đa|thang điểm|tổng điểm)\s*[:：=]\s*(\d+(?:[.,]\d+)?)/iu;
const TRAIL_PTS = /\s*[\(\[]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\s*[\)\]]\s*$/iu;
export const buildEssay = (lines) => {
    const stem = []; const rub = []; const sample = []; let mode = 'stem'; let maxScore = null;
    (lines || []).forEach((raw, i) => {
        const t = String(raw || '').trim(); if (!t) return;
        if (i === 0) {
            let first = t.replace(QPREFIX, '').trim(); const tp0 = first.match(TRAIL_PTS);
            if (tp0) { maxScore = parseFloat(tp0[1].replace(',', '.')); first = first.replace(TRAIL_PTS, '').trim(); }
            stem.push(first); return;
        }
        let m;
        if ((m = t.match(MAX_MK))) { maxScore = parseFloat(m[2].replace(',', '.')); return; }
        if ((m = t.match(RUBRIC_MK))) { mode = 'rubric'; if (m[2]) rub.push(m[2]); return; }
        if ((m = t.match(SAMPLE_MK))) { mode = 'sample'; if (m[2]) sample.push(m[2]); return; }
        (mode === 'rubric' ? rub : mode === 'sample' ? sample : stem).push(t);
    });
    let q = stem.join('\n').trim(); const tp = q.match(TRAIL_PTS);
    if (tp) { if (maxScore == null) maxScore = parseFloat(tp[1].replace(',', '.')); q = q.replace(TRAIL_PTS, '').trim(); }
    const rubric = normalizeRubric(rub.join('\n'));
    if (maxScore == null && rubric.length && rubric.every(r => r.points != null)) maxScore = Math.round(rubric.reduce((a, r) => a + r.points, 0) * 100) / 100;
    const out = { q, o: [], c: '', type: 'essay', sectionId: 'essay', rubric: rubric.length ? rubric : undefined, sampleAnswer: sample.join('\n').trim() || undefined, maxScore: maxScore != null && maxScore > 0 ? maxScore : undefined, parseConfidence: 0.95, parseReason: rubric.length ? 'Tự luận (PHẦN IV) có rubric.' : 'Tự luận (PHẦN IV). Chưa có rubric: AI sẽ tự đề xuất tiêu chí khi gợi ý điểm.', requiresReview: false };
    Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
    if (!q) return { ...out, type: 'unknown', parseConfidence: 0.4, requiresReview: true, parseReason: 'Câu tự luận không có nội dung.', expectedType: 'essay' };
    return out;
};

// ---- Trả lời ngắn ----
const TOL_MK = /^(sai số|tolerance)\s*[:：=]\s*(\d+(?:[.,]\d+)?)/iu;
export const buildShort = (lines) => {
    let tolerance; const kept = [];
    (lines || []).forEach(l => { const m = String(l || '').trim().match(TOL_MK); if (m) tolerance = parseFloat(m[2].replace(',', '.')); else kept.push(l); });
    const st = extractStructure(kept);
    const q = String(st.stem || '').replace(QPREFIX, '').trim();
    const base = { q, o: st.options, sectionId: 'short_answer' };
    const answers = st.answerLines.map(x => String(x || '').trim()).filter(Boolean);
    if (!answers.length) return { ...base, c: null, type: 'unknown', expectedType: 'short', parseConfidence: 0.4, requiresReview: true, parseReason: 'PHẦN III (trả lời ngắn) nhưng không tìm thấy dòng "Đáp án".' };
    if (answers.length === 1 && isPlainNumber(answers[0])) {
        return { ...base, c: toNumStr(answers[0]), type: 'short', answerType: 'number', ...(tolerance != null ? { tolerance } : {}), parseConfidence: 0.95, parseReason: 'Trả lời ngắn (số).', requiresReview: false };
    }
    const accepted = answers.join(' ; ').split(/\s*[;|]\s*/).map(x => x.trim()).filter(Boolean);
    const primary = accepted[0];
    return { ...base, c: primary, type: 'short', answerType: 'text', ...(accepted.length > 1 ? { acceptedAnswers: accepted } : {}), parseConfidence: 0.9, parseReason: 'Trả lời ngắn (chữ): so khớp chính xác (không bỏ dấu, không so mờ).', requiresReview: false };
};

// ---- Đổi tên loại cũ -> V2 + ép theo tiêu đề phần ----
// refined = kết quả refineQuestion (loại cũ: single | multi | numeric | unknown). section = id phần (hoặc null nếu đề không có tiêu đề phần).
const SECTION_NOTE = { multiple_choice: 'PHẦN I (một đáp án)', true_false: 'PHẦN II (Đúng/Sai)', short_answer: 'PHẦN III (trả lời ngắn)', essay: 'PHẦN IV (tự luận)' };
export const toV2 = (refined, section) => {
    const r = { ...refined };
    const legacy = r.type;
    if (legacy === 'multi') r.type = 'truefalse';
    else if (legacy === 'numeric') { r.type = 'short'; r.answerType = 'number'; }
    if (!section) { if (r.type !== 'unknown') r.sectionId = sectionIdForType(r.type); return r; }
    const want = SECTION_BY_ID[section].type;
    r.sectionId = section;
    if (r.type === want) {
        if (want === 'truefalse' && legacy === 'multi' && r.requiresReview !== true) { r.parseConfidence = Math.max(r.parseConfidence || 0, 0.97); }
        return r;
    }
    if (r.type === 'unknown') { r.expectedType = want; return r; }
    // Mâu thuẫn giữa tiêu đề phần và cách ghi đáp án: KHÔNG tự ép, đưa về unknown để người dùng quyết định.
    const detail = { single: 'một đáp án', truefalse: legacy === 'multi' && r.parseConfidence < 0.9 ? 'liệt kê chữ cái (vd "A,C")' : 'Đúng/Sai nhiều ý', short: 'một con số', essay: 'tự luận' }[r.type] || r.type;
    return { ...r, type: 'unknown', c: null, expectedType: want, parseConfidence: 0.4, requiresReview: true, parseReason: `Nằm ở ${SECTION_NOTE[section]} nhưng đáp án được ghi như ${detail}. Hãy chọn loại câu đúng.` };
};

export { refineQuestion, SECTION_DEFS, parseNumber };
