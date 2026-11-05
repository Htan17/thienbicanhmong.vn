import { parseRawQuizText } from '../lib/helpers.js';
import { DOCX_IMPORT_CONFIG as CFG, UNRESOLVED_REASON as WHY } from './docxImportTypes.js';

// Tiêu chí bắt đầu một câu: GIỐNG HỆT parseRawQuizText (lib/helpers.js) để ranh giới khớp với parser cũ.
const isQuestionStart = (t) => /^(Câu|Bài|Q)\s*\d+/i.test(t) || t.includes('?');

const imgKey = (im) => (im.dataUri ? `${im.bytes}:${im.dataUri.slice(30, 110)}:${im.dataUri.slice(-60)}` : null);

// lines: [{text, imgIds}], images: [{id, readable, reason, bytes, dataUri, mime}].
// Trả về { questions:[{id,q,o,c,type,imageIds,sourceNo}], unresolved:[{id,reason}], warnings:[] }.
// KHÔNG gọi AI, KHÔNG đoán: không chắc thì đưa ảnh vào unresolved.
export const parseDocxLines = (lines, images) => {
    const byId = {}; (images || []).forEach(im => { byId[im.id] = im; });
    const segs = []; const pre = []; let cur = null;
    (lines || []).forEach(l => {
        const t = (l.text || '').trim();
        if (t && isQuestionStart(t)) { cur = { lines: [t], imgs: [...(l.imgIds || [])] }; segs.push(cur); }
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
    const parsedSegs = segs.map(sg => ({ sg, parsed: parseRawQuizText(sg.lines.join('\n')) }));
    const whole = parseRawQuizText(segs.map(s => s.lines.join('\n')).join('\n'));
    const okCount = parsedSegs.filter(p => p.parsed.length === 1).length;
    const crossOk = parsedSegs.every(p => p.parsed.length <= 1) && whole.length === okCount;
    if (!crossOk) warnings.push('Không chắc chắn vị trí ảnh: số câu nhận được không khớp. Ảnh được để ở danh sách chưa gắn.');

    let no = 0;
    parsedSegs.forEach(({ sg, parsed }) => {
        no++;
        if (parsed.length !== 1) { sg.imgs.forEach(id => toUnresolved(id, classify(id) || WHY.ORPHAN)); return; }
        const p = parsed[0]; const imageIds = [];
        sg.imgs.forEach(id => {
            const bad = classify(id);
            if (bad) toUnresolved(id, bad);
            else if (!crossOk) toUnresolved(id, WHY.CROSSCHECK);
            else if (!imageIds.includes(id)) imageIds.push(id);
        });
        questions.push({ id: CFG.idPrefix + String(questions.length + 1).padStart(3, '0'), q: p.q, o: p.o, c: p.c, type: p.type, imageIds, sourceNo: no });
    });
    // Ảnh còn sót (không nằm trong dòng nào) cũng không bị mất
    (images || []).forEach(im => { if (!seen.has(im.id) && !questions.some(q => q.imageIds.includes(im.id))) toUnresolved(im.id, classify(im.id) || WHY.ORPHAN); });
    return { questions, unresolved, warnings, crossChecked: crossOk };
};
