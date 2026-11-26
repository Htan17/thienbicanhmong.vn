import { parseRawQuizText } from '../lib/helpers.js';
import { DOCX_IMPORT_CONFIG as CFG, UNRESOLVED_REASON as WHY } from './docxImportTypes.js';
import { refineQuestion } from './docxTypeDetector.js'; // GIAI ĐOẠN 1: nhận diện lại loại câu (Đúng/Sai, điền số, unknown); KHÔNG đổi cách chia câu/ghép ảnh
import { detectSectionHeader, buildEssay, buildShort, toV2 } from './docxSectionParser.js'; // GIAI ĐOẠN 2 (Quiz Engine V2): PHẦN I–IV + tên loại V2

// Tiêu chí bắt đầu một câu: GIỐNG HỆT parseRawQuizText (lib/helpers.js) để ranh giới khớp với parser cũ.
const isQuestionStart = (t) => /^(Câu|Bài|Q)\s*\d+/i.test(t) || t.includes('?');

const imgKey = (im) => (im.dataUri ? `${im.bytes}:${im.dataUri.slice(30, 110)}:${im.dataUri.slice(-60)}` : null);

// lines: [{text, imgIds}], images: [{id, readable, reason, bytes, dataUri, mime}].
// Trả về { questions:[{id,q,o,c,type,imageIds,sourceNo}], unresolved:[{id,reason}], warnings:[] }.
// KHÔNG gọi AI, KHÔNG đoán: không chắc thì đưa ảnh vào unresolved.
// GĐ2: các trường V2 đi kèm câu (chỉ thêm khi có)
const V2_KEYS = ['sectionId', 'expectedType', 'answerType', 'tolerance', 'acceptedAnswers', 'caseSensitive', 'rubric', 'maxScore', 'sampleAnswer'];
const v2Extra = (p) => { const o = {}; V2_KEYS.forEach(k => { if (p[k] !== undefined) o[k] = p[k]; }); return o; };

export const parseDocxLines = (lines, images) => {
    const byId = {}; (images || []).forEach(im => { byId[im.id] = im; });
    const segs = []; const pre = []; let cur = null; let curSection = null; let sawSection = false;
    (lines || []).forEach(l => {
        const t = (l.text || '').trim();
        const hdr = t ? detectSectionHeader(t) : null; // GĐ2: tiêu đề "PHẦN I..IV" (kiểm tra TRƯỚC isQuestionStart vì tiêu đề có thể chứa dấu "?")
        if (hdr) { curSection = hdr; sawSection = true; cur = null; pre.push(...(l.imgIds || [])); return; }
        if (t && curSection === 'essay' && /^(Câu|Bài)\s*\d+/i.test(t)) { cur = { lines: [t], imgs: [...(l.imgIds || [])], section: curSection }; segs.push(cur); }
        else if (t && curSection === 'essay' && cur) { cur.lines.push(t); cur.imgs.push(...(l.imgIds || [])); } // tự luận: dòng có "?" KHÔNG tự thành câu mới
        else if (t && isQuestionStart(t)) { cur = { lines: [t], imgs: [...(l.imgIds || [])], section: curSection }; segs.push(cur); }
        else if (cur) { if (t) cur.lines.push(t); cur.imgs.push(...(l.imgIds || [])); }
        else pre.push(...(l.imgIds || []));
    });

    const unresolved = []; const warnings = []; const questions = [];
    const dupCount = {}; (images || []).forEach(im => { const k = imgKey(im); if (k) dupCount[k] = (dupCount[k] || 0) + 1; });
    const classify = (id) => {
        const im = byId[id];
        if (!im || !im.readable) return WHY.UNREADABLE;
        const k = imgKey(im); if (k && dupCount[k] > 1) return WHY.DUPLICATE;
        return null;
    };
    const seen = new Set();
    const toUnresolved = (id, reason) => { if (seen.has(id)) return; seen.add(id); unresolved.push({ id, reason }); };

    // Ảnh nằm trước "Câu 1" -> không tự gắn
    pre.forEach(id => toUnresolved(id, classify(id) || WHY.BEFORE_FIRST));

    // Mỗi đoạn (từ 1 điểm bắt đầu câu đến trước điểm bắt đầu câu sau) cho ra tối đa 1 câu
    // GĐ2: câu Trả lời ngắn (PHẦN III) và Tự luận (PHẦN IV) được dựng trực tiếp (parser cũ chỉ hiểu câu có A–D hoặc đáp án số) nên không đưa vào phép kiểm tra chéo của parser cũ.
    const isDirect = (sg) => sg.section === 'short_answer' || sg.section === 'essay';
    const parsedSegs = segs.map(sg => ({ sg, parsed: isDirect(sg) ? null : parseRawQuizText(sg.lines.join('\n')) }));
    const normalSegs = parsedSegs.filter(p => p.parsed);
    const whole = parseRawQuizText(normalSegs.map(p => p.sg.lines.join('\n')).join('\n'));
    const okCount = normalSegs.filter(p => p.parsed.length === 1).length;
    const crossOk = normalSegs.every(p => p.parsed.length <= 1) && whole.length === okCount;
    if (!crossOk) warnings.push('Không chắc chắn vị trí ảnh: số câu nhận được không khớp. Ảnh được để ở danh sách chưa gắn.');

    let no = 0;
    parsedSegs.forEach(({ sg, parsed }) => {
        no++;
        if (!isDirect(sg) && parsed.length !== 1) { sg.imgs.forEach(id => toUnresolved(id, classify(id) || WHY.ORPHAN)); return; }
        // p = câu đã dựng: parser cũ + kiểm tra lại loại/đáp án (GĐ1), rồi đổi tên loại sang V2 và ép theo tiêu đề phần (GĐ2)
        const p = sg.section === 'essay' ? buildEssay(sg.lines) : sg.section === 'short_answer' ? buildShort(sg.lines) : toV2(refineQuestion(parsed[0], sg.lines), sg.section); const imageIds = [];
        sg.imgs.forEach(id => {
            const bad = classify(id);
            if (bad) toUnresolved(id, bad);
            else if (!crossOk) toUnresolved(id, WHY.CROSSCHECK);
            else if (!imageIds.includes(id)) imageIds.push(id);
        });
        questions.push({ id: CFG.idPrefix + String(questions.length + 1).padStart(3, '0'), q: p.q, o: p.o, c: p.c, type: p.type, parseConfidence: p.parseConfidence, parseReason: p.parseReason, requiresReview: p.requiresReview, ...(p.tfPartial ? { tfPartial: p.tfPartial } : {}), ...v2Extra(p), imageIds, sourceNo: no });
    });
    // Ảnh còn sót (không nằm trong dòng nào) cũng không bị mất
    (images || []).forEach(im => { if (!seen.has(im.id) && !questions.some(q => q.imageIds.includes(im.id))) toUnresolved(im.id, classify(im.id) || WHY.ORPHAN); });
    return { questions, unresolved, warnings, crossChecked: crossOk, hasSections: sawSection };
};
