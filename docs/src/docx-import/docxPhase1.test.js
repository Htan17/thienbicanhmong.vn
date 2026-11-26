// GIAI ĐOẠN 1 – test cho nhận diện loại câu, sửa/xóa câu trong preview, validation.
// Chạy: node --test src/docx-import/docxPhase1.test.js   (dùng "mammoth giả" như docxImport.test.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocxWithImages } from './docxImport.js';
import { refineQuestion } from './docxTypeDetector.js';
import { deleteQuestion, finalizeQuestions, updateQuestion, removeImage, assignImage } from './imageQuestionMatcher.js';
import { initDraft, switchDraftType, validateDraft, draftToFields } from './questionEditLogic.js';
import { validatePreview } from './previewValidation.js';
import { parseRawQuizText } from '../lib/helpers.js';

const B64 = (n) => Buffer.from('x'.repeat(n) + Math.random()).toString('base64');
const IMG = (name) => ({ img: name, mime: 'image/png', b64: B64(40) });
const fakeMammoth = (blocks) => ({
    images: { imgElement: (fn) => fn },
    convertToHtml: async (_in, { convertImage }) => {
        let html = '';
        for (const b of blocks) {
            if (typeof b === 'string') { html += `<p>${b.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`; continue; }
            const attrs = await convertImage({ contentType: b.mime, read: async () => b.b64 });
            html += `<p><img src="${attrs.src}" data-img-id="${attrs['data-img-id']}" /></p>`;
        }
        return { value: html, messages: [] };
    }
});
const run = (blocks) => importDocxWithImages(new ArrayBuffer(8), fakeMammoth(blocks));
const TFQ = (n, ans, extra = []) => [`Câu ${n}: Mỗi phát biểu sau đúng hay sai?`, ...extra, 'A. Ý a', 'B. Ý b', 'C. Ý c', 'D. Ý d', ...ans];
const refine = (lines) => refineQuestion(parseRawQuizText(lines.join('\n'))[0], lines);
const SQ = (ans) => ['Câu 1: Chọn đúng?', 'A. a', 'B. b', 'C. c', 'D. d', ans];

test('1-2 single: Đáp án A, Đáp án D', () => {
    const a = refine(SQ('Đáp án: A')); const d = refine(SQ('Đáp án: D'));
    assert.deepEqual([a.type, a.c, d.type, d.c], ['single', 0, 'single', 3]); assert.equal(a.requiresReview, false);
});
test('3-5 numeric: 3, 12.5, -2.75 (và dấu phẩy thập phân)', () => {
    const f = (x) => refine(['Câu 1: Tính giá trị?', `Đáp án: ${x}`]);
    assert.deepEqual([f('3').type, f('3').c, f('12.5').c, f('-2.75').c, f('12,5').c], ['numeric', '3', '12.5', '-2.75', '12.5']);
});
test('6 "Có bao nhiêu phát biểu đúng?" -> numeric dù có (1)(2)(3) hoặc A-D', () => {
    const r = refine(['Câu 1: Có bao nhiêu phát biểu đúng?', 'A. (1) đúng', 'B. (2) sai', 'C. (3) đúng', 'D. (4) sai', 'Đáp án: 2']);
    assert.equal(r.type, 'numeric'); assert.equal(r.c, '2'); assert.equal(r.requiresReview, false);
});
test('7-9 multi: Đúng/Sai, Đ/S, true/false (c = chỉ số ý ĐÚNG, đúng cấu trúc Quiz Engine)', () => {
    for (const ans of [['Đáp án: A Đúng, B Sai, C Đúng, D Sai'], ['Đáp án: A-Đ, B-S, C-Đ, D-S'], ['Đáp án: A Đ; B S; C Đ; D S'], ['Đáp án:', 'A true', 'B false', 'C true', 'D false'], ['Đáp án:', 'A: true', 'B: false', 'C: true', 'D: false'], ['Đáp án:', 'A. Đúng', 'B. Sai', 'C. Đúng', 'D. Sai']]) {
        const r = refine(TFQ(1, ans)); assert.equal(r.type, 'multi', ans.join('|')); assert.deepEqual(r.c, [0, 2]); assert.deepEqual(r.o, ['Ý a', 'Ý b', 'Ý c', 'Ý d']); assert.equal(r.requiresReview, false);
    }
});
test('9b multi: tất cả Sai -> c rỗng (không nhầm thành thiếu dữ liệu)', () => {
    const r = refine(TFQ(1, ['Đáp án: A Sai, B Sai, C Sai, D Sai'])); assert.equal(r.type, 'multi'); assert.deepEqual(r.c, []);
});
test('9c "Đáp án: A,C" giữ tương thích multi nhưng PHẢI đánh dấu cần kiểm tra', () => {
    const r = refine(TFQ(1, ['Đáp án: A,C'])); assert.equal(r.type, 'multi'); assert.deepEqual(r.c, [0, 2]); assert.equal(r.requiresReview, true); assert.ok(r.parseConfidence < 0.9); assert.ok(r.parseReason);
});
test('10 format không rõ -> unknown (không ép single/multi/numeric)', () => {
    for (const ans of [['Đáp án:'], ['Đáp án: không rõ'], ['Đáp án: E'], ['Đáp án: A Đúng, B Sai']]) {
        const r = refine(TFQ(1, ans)); assert.equal(r.type, 'unknown', ans.join('|')); assert.equal(r.requiresReview, true); assert.equal(r.parseConfidence, 0.4); assert.ok(r.parseReason);
    }
    const none = refine(['Câu 1: X?', 'A. 1', 'B. 2']); assert.equal(none.type, 'unknown');
});
test('10b Đúng/Sai thiếu ý -> unknown nhưng giữ phần đã đọc (tfPartial)', () => {
    const r = refine(TFQ(1, ['Đáp án: A Đúng, B Sai'])); assert.deepEqual(r.tfPartial, [true, false, null, null]); assert.match(r.parseReason, /C, D/);
});

const dataOfAll = (r) => (id) => r.images.find(x => x.id === id).dataUri;
test('11-13 câu có ảnh + single / multi / numeric: loại + đáp án + ảnh đều đúng', async () => {
    const r = await run([
        'Câu 1: Hình bên?', IMG('a'), 'A. 1', 'B. 2', 'C. 3', 'D. 4', 'Đáp án: C',
        ...TFQ(2, ['Đáp án: A-Đ, B-S, C-Đ, D-S'], [IMG('b')]),
        'Câu 3: Tính?', IMG('c'), 'Đáp án: -2.75']);
    const f = finalizeQuestions(r.state, dataOfAll(r));
    assert.deepEqual(f.map(q => q.type), ['single', 'truefalse', 'short']); // GĐ2: tên V2
    assert.equal(f[0].c, 2); assert.deepEqual(f[1].c, [0, 2]); assert.equal(f[2].c, '-2.75');
    assert.ok(f.every(q => q.img && q.images.length === 1));
    assert.deepEqual(f.map(q => q.index), [1, 2, 3]);
    assert.ok(f.every(q => !('imageIds' in q) && !('tfPartial' in q) && !('parseReason' in q)), 'không rò field tạm của UI');
    assert.ok(f.every(q => !q.img.startsWith('blob:')));
});

const mkState = async () => run([
    ...['Câu 1: Một?', IMG('a'), 'A. 1', 'B. 2', 'Đáp án: B'],
    ...['Câu 2: Hai?', IMG('b'), IMG('c'), 'A. 1', 'B. 2', 'Đáp án: A'],
    ...['Câu 3: Ba?', 'A. 1', 'B. 2', 'Đáp án: B'],
    ...['Câu 4: Bốn?', IMG('d'), 'A. 1', 'B. 2', 'Đáp án: A']]);
const same = (q) => [q.q, q.o, q.c, q.type];

test('14-16 sửa đổi loại: single->multi, multi->numeric, numeric->single', () => {
    let d = initDraft({ q: 'Q', type: 'single', o: ['a', 'b', 'c', 'd'], c: 1 });
    d = switchDraftType(d, 'multi'); assert.equal(d.type, 'truefalse'); assert.deepEqual(d.o, ['a', 'b', 'c', 'd']); // không mất lựa chọn
    assert.ok(validateDraft(d).some(e => /chưa chọn Đúng\/Sai/.test(e)), 'multi: chặn khi còn ý chưa đánh dấu');
    d = { ...d, tf: [true, false, true, false] }; assert.deepEqual(validateDraft(d), []); assert.deepEqual(draftToFields(d).c, [0, 2]);
    d = switchDraftType(d, 'numeric'); assert.equal(d.q, 'Q'); assert.ok(validateDraft(d).length); // chưa có số
    d = { ...d, c: '-2,5' }; assert.deepEqual(validateDraft(d), []); assert.deepEqual([draftToFields(d).type, draftToFields(d).c, draftToFields(d).answerType], ['short', '-2.5', 'number']);
    d = switchDraftType(d, 'single'); assert.equal(d.c, null); assert.ok(validateDraft(d).some(e => /đáp án đúng/.test(e)), 'single: bắt buộc chọn 1 đáp án, không giữ mảng c');
    d = { ...d, c: 3 }; assert.deepEqual([draftToFields(d).type, draftToFields(d).c], ['single', 3]);
    assert.ok(!Array.isArray(draftToFields(d).c));
});
test('14b unknown -> phải chọn loại mới lưu được; tfPartial điền sẵn', () => {
    const q = { q: 'Q', type: 'unknown', o: ['a', 'b', 'c'], c: null, tfPartial: [true, false, null] };
    let d = initDraft(q); assert.ok(validateDraft(d).some(e => /Chưa chọn loại câu/.test(e)));
    d = switchDraftType(d, 'multi'); assert.deepEqual(d.tf, [true, false, null]); d = { ...d, tf: [true, false, true] }; assert.deepEqual(validateDraft(d), []);
});
test('17 sửa nội dung/loại không làm mất ảnh, ảnh chính, unresolved', async () => {
    const r = await run([IMG('x'), ...['Câu 1: Một?', IMG('a'), IMG('b'), 'A. 1', 'B. 2', 'Đáp án: B']]);
    let st = r.state; const before = st.questions[0].imageIds; const unres = st.unresolved.length; assert.equal(unres, 1);
    st = updateQuestion(st, 0, { q: 'Đã sửa', type: 'multi', o: ['p', 'q'], c: [1] });
    assert.deepEqual(st.questions[0].imageIds, before); assert.equal(st.unresolved.length, unres);
    assert.equal(st.questions[0].requiresReview, false); assert.equal(st.questions[0].id, r.state.questions[0].id);
    const f = finalizeQuestions(st, dataOfAll(r)); assert.equal(f[0].images.length, 2); assert.equal(f[0].img, f[0].images[0]);
});
test('18 xóa câu không ảnh: đổi số thứ tự, các câu còn lại giữ nguyên', async () => {
    const r = await mkState(); const orig = r.state.questions.map(same);
    const st = deleteQuestion(r.state, 2); assert.equal(st.questions.length, 3);
    assert.deepEqual(st.questions.map(same), [orig[0], orig[1], orig[3]]); // 22-23
    assert.deepEqual(finalizeQuestions(st, dataOfAll(r)).map(q => q.index), [1, 2, 3]);
    assert.equal(r.state.questions.length, 4, 'state cũ không bị biến đổi');
});
test('19 xóa câu có 1 ảnh -> mặc định ảnh về "chưa gắn"; không dồn sang câu kế', async () => {
    const r = await mkState(); const idA = r.state.questions[0].imageIds[0];
    const st = deleteQuestion(r.state, 0, 'unassign');
    assert.ok(st.unresolved.some(u => u.id === idA)); assert.ok(!st.questions.some(q => q.imageIds.includes(idA)));
    assert.deepEqual(st.questions[0].imageIds, r.state.questions[1].imageIds);
});
test('20-21 xóa câu nhiều ảnh: unassign -> về unresolved; drop -> bỏ khỏi phiên (không rơi sang câu khác)', async () => {
    const r = await mkState(); const ids = r.state.questions[1].imageIds; assert.equal(ids.length, 2);
    const u = deleteQuestion(r.state, 1, 'unassign'); assert.ok(ids.every(id => u.unresolved.some(x => x.id === id)));
    const d = deleteQuestion(r.state, 1, 'drop'); assert.ok(ids.every(id => !d.unresolved.some(x => x.id === id) && !d.questions.some(q => q.imageIds.includes(id))));
    assert.deepEqual(d.dropped, ids);
    const all = [...d.questions.flatMap(q => q.imageIds), ...d.unresolved.map(x => x.id), ...d.dropped]; assert.equal(new Set(all).size, all.length, 'mỗi ảnh chỉ ở một nơi');
});
test('21b ảnh về unresolved có thể gán lại cho câu khác', async () => {
    const r = await mkState(); const id = r.state.questions[0].imageIds[0];
    let st = deleteQuestion(r.state, 0); st = assignImage(st, id, 0); assert.ok(st.questions[0].imageIds.includes(id)); assert.ok(!st.unresolved.some(x => x.id === id));
});

test('XII validation: chặn và liệt kê cụ thể từng lỗi', () => {
    const base = (o) => ({ id: 'q', imageIds: [], q: 'Nội dung', o: ['a', 'b'], c: 0, type: 'single', ...o });
    assert.deepEqual(validatePreview({ questions: [base()], unresolved: [] }), []);
    const st = { questions: [base({ type: 'unknown', c: null, parseReason: 'x' }), base({ c: null }), base({ c: 5 }), base({ q: ' ' }), base({ type: 'numeric', o: [], c: '' }), base({ type: 'multi', c: [0, 9] }), base({ type: 'weird' })], unresolved: [{ id: 'i1' }, { id: 'i2' }] };
    const e = validatePreview(st);
    assert.ok(e.some(x => /^Câu 1: chưa xác định loại câu/.test(x)) && e.some(x => /^Câu 2: thiếu đáp án đúng/.test(x)) && e.some(x => /^Câu 3: đáp án .* vượt/.test(x)) && e.some(x => /^Câu 4: nội dung trống/.test(x)) && e.some(x => /^Câu 5: thiếu hoặc sai đáp án số/.test(x)) && e.some(x => /^Câu 6: dữ liệu Đúng\/Sai/.test(x)) && e.some(x => /^Câu 7: loại câu/.test(x)) && e.some(x => /Còn 2 ảnh chưa gán/.test(x)), e.join('\n'));
    assert.ok(!validatePreview(st, { ackUnresolved: true }).some(x => /ảnh chưa gán/.test(x)));
    // người dùng sửa câu unknown + xác nhận -> hết chặn
    const fixed = updateQuestion({ questions: [base({ type: 'unknown', c: null })], unresolved: [], dropped: [] }, 0, { q: 'Nội dung', type: 'single', o: ['a', 'b'], c: 1 });
    assert.deepEqual(validatePreview(fixed), []);
});

test('24 parseRawQuizText (TXT importer) KHÔNG bị thay đổi', () => {
    const t = 'Câu 1: A?\nA. 1\nB. 2\nC. 3\nD. 4\nĐáp án: B\nCâu 2: Nhiều?\nA. 1\nB. 2\nC. 3\nĐáp án: A,C\nCâu 3: Tính?\nĐáp án: 12.5';
    assert.deepEqual(parseRawQuizText(t), [{ q: 'A?', o: ['1', '2', '3', '4'], c: 1, type: 'single' }, { q: 'Nhiều?', o: ['1', '2', '3'], c: [0, 2], type: 'multi' }, { q: 'Tính?', o: [], c: '12.5', type: 'numeric' }]);
});
test('pipeline: câu thường vẫn y như parser cũ (q,o,c,type) và cách ghép ảnh không đổi', async () => {
    const r = await mkState(); const ref = parseRawQuizText(['Câu 1: Một?', 'A. 1', 'B. 2', 'Đáp án: B'].join('\n'))[0];
    assert.deepEqual(same(r.state.questions[0]), [ref.q, ref.o, ref.c, ref.type]);
    assert.deepEqual(r.state.questions.map(q => q.imageIds.length), [1, 2, 0, 1]);
});
