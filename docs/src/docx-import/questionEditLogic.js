// Logic sửa 1 câu trong DOCX Preview (thuần hàm, dễ test). Chỉ làm việc trên bản nháp TRONG preview.
// GĐ1: single / Đúng-Sai / điền số.  GĐ2 (Quiz Engine V2): 4 loại single | truefalse | short (số hoặc chữ) | essay.
// Tên cũ 'multi' (= truefalse) và 'numeric' (= short, answerType number) vẫn được nhận khi đọc, nhưng dữ liệu MỚI luôn ghi tên V2.
// Không đụng imageIds: ảnh vẫn do các nút Chuyển câu / Gỡ / Đặt chính quản lý.
import { TYPE_LABEL_V2, normalizeType, parseNumber, shortAnswerType } from '../quiz-v2/questionTypes.js';
import { normalizeRubric } from '../quiz-v2/essayRubric.js';

export const TYPE_LABEL = TYPE_LABEL_V2;
export const MAX_OPTS = 6; export const MIN_OPTS = 2;
const L = (i) => String.fromCharCode(65 + i);
const rubricToText = (r) => normalizeRubric(r).map(x => (x.points != null ? `${x.text} (${x.points} điểm)` : x.text)).join('\n');
const acceptedToText = (q) => { const a = [String(q.c == null ? '' : q.c), ...(Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [])].map(x => String(x).trim()).filter(Boolean); return [...new Set(a)].join('\n'); };

// Bản nháp: { q, type, o[], c, tf[], ... }. tf[i] = true/false/null (null = chưa đánh dấu) – chỉ dùng cho Đúng/Sai.
export const initDraft = (q) => {
    const type = q.type === 'unknown' ? 'unknown' : normalizeType(q.type);
    const o = Array.isArray(q.o) ? [...q.o] : [];
    let tf = [];
    if (type === 'truefalse') { const set = Array.isArray(q.c) ? q.c : []; tf = o.map((_, i) => set.includes(i)); }
    else if (Array.isArray(q.tfPartial)) tf = [...q.tfPartial];
    const isShort = type === 'short';
    return {
        q: q.q || '', type, o: o.length ? o : ['', '', '', ''], hadOptions: o.length > 0, tf,
        c: type === 'unknown' ? null : (type === 'essay' ? '' : (Array.isArray(q.c) ? null : (isShort && shortAnswerType(q) === 'text' ? '' : q.c))),
        answerType: isShort ? shortAnswerType(q) : 'number',
        tolerance: isShort && typeof q.tolerance === 'number' ? String(q.tolerance) : '',
        accepted: isShort && shortAnswerType(q) === 'text' ? acceptedToText(q) : '',
        caseSensitive: isShort && q.caseSensitive === true,
        rubricText: type === 'essay' ? rubricToText(q.rubric) : '', maxScore: type === 'essay' && typeof q.maxScore === 'number' ? String(q.maxScore) : '',
        sampleAnswer: type === 'essay' && q.sampleAnswer ? String(q.sampleAnswer) : '',
        hint: q.expectedType || null
    };
};

// Đổi loại: KHÔNG xóa nội dung câu và KHÔNG xóa lựa chọn (chỉ chuẩn hóa đáp án). Không giữ mảng c của truefalse khi sang single.
export const switchDraftType = (d, newTypeRaw) => {
    const newType = normalizeType(newTypeRaw);
    const forceNumber = newTypeRaw === 'numeric';
    if (d.type === newType && !(forceNumber && d.answerType !== 'number')) return d;
    const o = d.o.length >= 2 ? [...d.o] : ['', '', '', ''];
    if (newType === 'single') return { ...d, type: 'single', o, c: Number.isInteger(d.c) && d.c < o.length ? d.c : null };
    if (newType === 'truefalse') {
        const tf = o.map((_, i) => (d.tf[i] === true || d.tf[i] === false ? d.tf[i] : (d.type === 'truefalse' ? false : null)));
        return { ...d, type: 'truefalse', o, tf, c: null };
    }
    if (newType === 'short') {
        const prevNum = d.type === 'short' ? d.c : ''; // c của single là CHỈ SỐ lựa chọn, không phải đáp án số -> không mang sang
        return { ...d, type: 'short', c: prevNum == null ? '' : prevNum, answerType: forceNumber ? 'number' : (d.type === 'short' ? d.answerType : 'number') }; // o được giữ lại làm nội dung kèm theo
    }
    return { ...d, type: 'essay', c: '' }; // essay: o giữ trong bản nháp (để đổi lại không mất) nhưng không lưu
};

const numOk = (c) => c !== '' && c !== null && c !== undefined && !Number.isNaN(parseNumber(c));
const acceptedList = (d) => String(d.accepted || '').split(/\n|;/).map(x => x.trim()).filter(Boolean);

// Trả danh sách lỗi (rỗng = hợp lệ).
export const validateDraft = (d) => {
    const err = [];
    if (!String(d.q || '').trim()) err.push('Nội dung câu hỏi đang trống.');
    if (!['single', 'truefalse', 'short', 'essay'].includes(d.type)) { err.push('Chưa chọn loại câu.'); return err; }
    if (d.type === 'single' || d.type === 'truefalse') {
        const filled = d.o.map(x => String(x || '').trim());
        if (filled.length < MIN_OPTS) err.push(`Cần ít nhất ${MIN_OPTS} lựa chọn/ý.`);
        filled.forEach((x, i) => { if (!x) err.push(`${d.type === 'truefalse' ? 'Ý' : 'Lựa chọn'} ${L(i)} đang trống.`); });
    }
    if (d.type === 'single' && !(Number.isInteger(d.c) && d.c >= 0 && d.c < d.o.length)) err.push('Chưa chọn đáp án đúng.');
    if (d.type === 'truefalse') d.o.forEach((_, i) => { if (d.tf[i] !== true && d.tf[i] !== false) err.push(`Ý ${L(i)} chưa chọn Đúng/Sai.`); });
    if (d.type === 'short') {
        if (d.answerType === 'text') { if (!acceptedList(d).length) err.push('Cần ít nhất 1 đáp án được chấp nhận (mỗi dòng một đáp án).'); }
        else {
            if (!numOk(d.c)) err.push('Đáp án số chưa hợp lệ (cho phép số âm, số thập phân).');
            if (String(d.tolerance || '').trim() !== '' && !(parseNumber(d.tolerance) >= 0)) err.push('Sai số (tolerance) phải là số không âm.');
        }
    }
    if (d.type === 'essay' && String(d.maxScore || '').trim() !== '' && !(parseNumber(d.maxScore) > 0)) err.push('Điểm tối đa phải là số lớn hơn 0.');
    return err;
};

// Chuyển bản nháp hợp lệ thành các trường đúng cấu trúc Quiz Engine V2 (q, type, o, c + trường riêng của loại).
export const draftToFields = (d) => {
    const q = String(d.q).trim(); const o = d.o.map(x => String(x).trim());
    if (d.type === 'single') return { q, type: 'single', o, c: d.c };
    if (d.type === 'truefalse') return { q, type: 'truefalse', o, c: d.o.map((_, i) => i).filter(i => d.tf[i] === true) };
    if (d.type === 'short') {
        const keep = d.hadOptions ? o.filter(Boolean) : [];
        if (d.answerType === 'text') {
            const list = acceptedList(d);
            return { q, type: 'short', o: keep, c: list[0], answerType: 'text', ...(list.length > 1 ? { acceptedAnswers: list } : {}), ...(d.caseSensitive ? { caseSensitive: true } : {}) };
        }
        const tol = String(d.tolerance || '').trim();
        return { q, type: 'short', o: keep, c: String(d.c).trim().replace(',', '.'), answerType: 'number', ...(tol !== '' ? { tolerance: parseNumber(tol) } : {}) };
    }
    const rubric = normalizeRubric(d.rubricText); const ms = String(d.maxScore || '').trim();
    return { q, type: 'essay', o: [], c: '', ...(rubric.length ? { rubric } : {}), ...(ms !== '' ? { maxScore: parseNumber(ms) } : {}), ...(String(d.sampleAnswer || '').trim() ? { sampleAnswer: String(d.sampleAnswer).trim() } : {}) };
};

export const removeDraftOption = (d, i) => {
    if (d.o.length <= MIN_OPTS) return d;
    const o = d.o.filter((_, k) => k !== i); const tf = d.tf.filter((_, k) => k !== i);
    let c = d.c; if (Number.isInteger(c)) c = c === i ? null : (c > i ? c - 1 : c);
    return { ...d, o, tf, c };
};
export const addDraftOption = (d) => (d.o.length >= MAX_OPTS ? d : { ...d, o: [...d.o, ''], tf: d.type === 'truefalse' ? [...d.tf, null] : d.tf });
