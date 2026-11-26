// GIAI ĐOẠN 2 (Quiz Engine V2) – test nhập DOCX theo PHẦN I–IV, loại câu V2, sửa/chuyển/thêm/xóa câu giữ nguyên ảnh.
// Chạy: node --test src/docx-import/docxPhase2.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocxWithImages, hasSectionHeaders } from './docxImport.js';
import { detectSectionHeader } from './docxSectionParser.js';
import { addQuestion, deleteQuestion, finalizeQuestions, groupBySection, moveQuestionToSection, updateQuestion, assignImage } from './imageQuestionMatcher.js';
import { initDraft, switchDraftType, validateDraft, draftToFields } from './questionEditLogic.js';
import { validatePreview } from './previewValidation.js';
import { validateQuestionV2 } from '../quiz-v2/validateQuestion.js';
import { flattenQuiz, getQuizSections, quizHasV2 } from '../quiz-v2/quizSections.js';

const B64 = (n) => Buffer.from('y'.repeat(n) + Math.random()).toString('base64');
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
const run = (blocks) => importDocxWithImages(new ArrayBuffer(8), fakeMammoth(blocks), { allowTextOnly: true });
const dataOf = (id) => 'data:image/png;base64,' + id;

const FULL = [
    'PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN. Thí sinh trả lời từ câu 1 đến câu 2.',
    'Câu 1: Thủ đô của Việt Nam là gì?', 'A. Huế', 'B. Hà Nội', 'C. Đà Nẵng', 'D. Cần Thơ', 'Đáp án: B',
    'Câu 2: 1 + 1 bằng?', 'A. 1', 'B. 2', 'C. 3', 'D. 4', 'Đáp án: B',
    'PHẦN II. ĐÚNG / SAI. Mỗi ý hỏi đúng hay sai?',
    'Câu 1: Xét các phát biểu về nước:', 'A. Nước sôi ở 100 độ C', 'B. Nước đóng băng ở 10 độ C', 'C. Nước là hợp chất', 'D. Nước là đơn chất', 'Đáp án: A Đúng, B Sai, C Đúng, D Sai',
    'Câu 2: Mỗi nhận định sau đúng hay sai?', 'A. a', 'B. b', 'C. c', 'D. d', 'Đáp án: A-Đ, B-S, C-S, D-Đ',
    'PHẦN III. TRẢ LỜI NGẮN',
    'Câu 1: Có bao nhiêu phát biểu đúng ở câu 1 phần II?', 'Đáp án: 2',
    'Câu 2: Tính nhiệt độ tuyệt đối.', 'Đáp án: -2,75',
    'Câu 3: Thủ đô của Việt Nam?', 'Đáp án: Hà Nội; Thủ đô Hà Nội',
    'PHẦN IV. TỰ LUẬN',
    'Câu 1: Phân tích vai trò của nước? (3 điểm)', 'Cần nêu đủ ý.', 'Rubric:', '- Nêu đúng vai trò sinh học (2 điểm)', '- Có ví dụ minh họa (1 điểm)', 'Đáp án mẫu: Nước là dung môi...'
];

test('P2-1 nhận diện tiêu đề PHẦN I–IV (từ khóa ưu tiên hơn số La Mã)', () => {
    assert.equal(detectSectionHeader('PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN'), 'multiple_choice');
    assert.equal(detectSectionHeader('Phần II: Đúng/Sai'), 'true_false');
    assert.equal(detectSectionHeader('PHẦN III - Trả lời ngắn'), 'short_answer');
    assert.equal(detectSectionHeader('PHẦN IV. TỰ LUẬN'), 'essay');
    assert.equal(detectSectionHeader('PHẦN 2'), 'true_false');
    assert.equal(detectSectionHeader('PHẦN II. TRẮC NGHIỆM ĐÚNG SAI'), 'true_false');   // từ khóa "đúng sai" thắng chữ "trắc nghiệm"
    assert.equal(detectSectionHeader('Phần thưởng cho người học'), null);
    assert.equal(detectSectionHeader('Câu 1: PHẦN I là gì?'), null);
    assert.equal(hasSectionHeaders('abc\nPHẦN II. ĐÚNG / SAI\nxyz'), true); assert.equal(hasSectionHeaders('Câu 1: x?'), false);
});

test('P2-2 DOCX chỉ chữ có PHẦN I–IV: đúng loại, đáp án, section, thứ tự', async () => {
    const r = await run(FULL); const q = r.state.questions;
    assert.equal(r.hasSections, true); assert.equal(r.hasImages, false);
    assert.deepEqual(q.map(x => x.type), ['single', 'single', 'truefalse', 'truefalse', 'short', 'short', 'short', 'essay']);
    assert.deepEqual(q.map(x => x.sectionId), ['multiple_choice', 'multiple_choice', 'true_false', 'true_false', 'short_answer', 'short_answer', 'short_answer', 'essay']);
    assert.equal(q[0].c, 1); assert.equal(q[0].o[1], 'Hà Nội');
    assert.deepEqual(q[2].c, [0, 2]); assert.deepEqual(q[3].c, [0, 3]); assert.equal(q[2].requiresReview, false);
    assert.deepEqual([q[4].c, q[4].answerType], ['2', 'number']);                      // "Có bao nhiêu...?" -> short/number, KHÔNG thành truefalse
    assert.deepEqual([q[5].c, q[5].answerType], ['-2.75', 'number']);
    assert.deepEqual([q[6].c, q[6].answerType, q[6].acceptedAnswers], ['Hà Nội', 'text', ['Hà Nội', 'Thủ đô Hà Nội']]);
    const e = q[7]; assert.equal(e.q, 'Phân tích vai trò của nước?\nCần nêu đủ ý.'); assert.equal(e.maxScore, 3);
    assert.deepEqual(e.rubric, [{ text: 'Nêu đúng vai trò sinh học', points: 2 }, { text: 'Có ví dụ minh họa', points: 1 }]); assert.equal(e.sampleAnswer, 'Nước là dung môi...');
    q.forEach((x, i) => assert.deepEqual(validateQuestionV2(x, `Câu ${i + 1}: `), []));
});

test('P2-3 tiêu đề phần là tín hiệu mạnh: mâu thuẫn -> unknown (không ép), kèm gợi ý loại', async () => {
    const r = await run(['PHẦN I. TRẮC NGHIỆM', 'Câu 1: Chọn?', 'A. a', 'B. b', 'C. c', 'D. d', 'Đáp án: A,C',
        'Câu 2: Tính?', 'A. 1', 'B. 2', 'Đáp án: 3',
        'PHẦN II. ĐÚNG / SAI', 'Câu 1: Mỗi ý đúng hay sai?', 'A. a', 'B. b', 'C. c', 'D. d', 'Đáp án: A,C',
        'Câu 2: Mỗi ý đúng hay sai?', 'A. a', 'B. b', 'Đáp án: B']);
    const q = r.state.questions;
    assert.equal(q[0].type, 'unknown'); assert.equal(q[0].expectedType, 'single'); assert.equal(q[0].sectionId, 'multiple_choice'); assert.equal(q[0].requiresReview, true);
    assert.equal(q[1].type, 'unknown'); assert.match(q[1].parseReason, /PHẦN I/);
    assert.equal(q[2].type, 'truefalse'); assert.deepEqual(q[2].c, [0, 2]); assert.equal(q[2].requiresReview, true); // "A,C" ở PHẦN II: tương thích nhưng bắt buộc kiểm tra
    assert.equal(q[3].type, 'unknown'); assert.equal(q[3].expectedType, 'truefalse');
    assert.ok(validatePreview(r.state).length >= 3);
});

test('P2-4 tự luận: dòng có "?" không tách thành câu mới; Phần IV không bị parser cũ nuốt', async () => {
    const r = await run(['PHẦN IV. TỰ LUẬN', 'Câu 1: Vì sao trời mưa?', 'Hãy giải thích tại sao có hiện tượng này?', 'Điểm tối đa: 2,5', 'Câu 2: Nêu quan điểm của em.']);
    const q = r.state.questions;
    assert.equal(q.length, 2); assert.equal(q[0].type, 'essay'); assert.match(q[0].q, /Hãy giải thích/); assert.equal(q[0].maxScore, 2.5);
    assert.equal(q[1].type, 'essay'); assert.equal(q[1].maxScore, undefined); assert.deepEqual(validateQuestionV2(q[1]), []);
});

test('P2-5 DOCX không có PHẦN: parser cũ + heuristic, tên loại V2, nhóm theo loại', async () => {
    const r = await run(['Câu 1: Số?', 'Đáp án: 3', 'Câu 2: Chọn?', 'A. a', 'B. b', 'C. c', 'D. d', 'Đáp án: C', 'Câu 3: Mỗi ý đúng hay sai?', 'A. a', 'B. b', 'C. c', 'D. d', 'Đáp án: A Đ, B S, C Đ, D S', 'Câu 4: Lạ?', 'A. a', 'B. b']);
    assert.equal(r.hasSections, false);
    const q = r.state.questions;
    assert.deepEqual(q.map(x => x.type), ['single', 'truefalse', 'short', 'unknown']);                  // đã gom PHẦN I -> III, unknown ở cuối
    assert.equal(q[2].answerType, 'number'); assert.equal(q[3].sectionId, undefined);
    assert.deepEqual(groupBySection(q).map(g => g.id), ['multiple_choice', 'true_false', 'short_answer', 'unknown']);
});

test('P2-6 ảnh theo câu ở nhiều phần + chuyển phần/sửa loại/thêm câu/xóa câu KHÔNG làm mất ảnh', async () => {
    const r = await run(['PHẦN I. TRẮC NGHIỆM', 'Câu 1: Hình bên?', IMG('i1'), 'A. a', 'B. b', 'C. c', 'D. d', 'Đáp án: A',
        'PHẦN II. ĐÚNG / SAI', 'Câu 1: Mỗi ý đúng hay sai?', IMG('i2'), 'A. a', 'B. b', 'Đáp án: A Đ, B S',
        'PHẦN IV. TỰ LUẬN', 'Câu 1: Phân tích đồ thị.', IMG('i3'), IMG('i4')]);
    let st = r.state; const ids = (s) => s.questions.map(q => q.imageIds.length);
    assert.equal(r.hasImages, true); assert.deepEqual(ids(st), [1, 1, 2]); assert.equal(st.unresolved.length, 0);
    // chuyển câu 1 (PHẦN I) sang PHẦN III: ảnh giữ nguyên, câu bị đánh dấu cần kiểm tra, chuyển nhóm
    st = moveQuestionToSection(st, 0, 'short_answer'); assert.equal(st.questions.length, 3);
    const mv = st.questions.find(x => x.q === 'Hình bên?'); assert.equal(mv.type, 'short'); assert.equal(mv.sectionId, 'short_answer'); assert.equal(mv.imageIds.length, 1); assert.equal(mv.requiresReview, true);
    assert.deepEqual(groupBySection(st.questions).map(g => g.id), ['true_false', 'short_answer', 'essay']);
    assert.ok(validatePreview(st).some(e => /đáp án số/.test(e)), 'câu vừa chuyển phải được xác nhận lại đáp án');
    // sửa lại loại: ảnh vẫn còn
    const mi = st.questions.indexOf(mv); st = updateQuestion(st, mi, { q: 'Hình bên?', type: 'short', o: [], c: '7', answerType: 'number' });
    assert.equal(st.questions.find(x => x.q === 'Hình bên?').imageIds.length, 1);
    // thêm câu vào PHẦN I (đang trống): đứng đầu; chưa hợp lệ nên chặn lưu
    const add = addQuestion(st, 'multiple_choice'); st = add.state; assert.equal(add.index, 0); assert.equal(st.questions[0].sectionId, 'multiple_choice');
    assert.ok(validatePreview(st).some(e => /^Câu 1: nội dung trống/.test(e)));
    st = updateQuestion(st, 0, { q: 'Câu mới', type: 'single', o: ['a', 'b'], c: 1 }); assert.deepEqual(validatePreview(st), []);
    // xóa câu có 2 ảnh -> về unresolved, không rơi sang câu khác
    const ei = st.questions.findIndex(x => x.type === 'essay'); const before = st.questions.filter((_, i) => i !== ei).map(q => q.imageIds.join('|'));
    st = deleteQuestion(st, ei, 'unassign'); assert.equal(st.unresolved.length, 2); assert.deepEqual(st.questions.map(q => q.imageIds.join('|')), before);
    // lưu: đánh số lại 1..n theo PHẦN, ảnh đúng câu, sectionId có đủ
    st = { ...st, unresolved: [] }; const fin = finalizeQuestions(st, dataOf);
    assert.deepEqual(fin.map(q => q.index), [1, 2, 3]); assert.deepEqual(fin.map(q => q.sectionId), ['multiple_choice', 'true_false', 'short_answer']);
    assert.ok(fin.every(q => q.images.length === (q.q === 'Câu mới' ? 0 : 1)));
    assert.equal(quizHasV2(fin), true); assert.equal(getQuizSections(fin).length, 3); assert.equal(flattenQuiz({ sections: getQuizSections(fin) }).length, 3);
});

test('P2-7 editor: 4 loại, đổi loại không mất nội dung/lựa chọn, short text, essay', () => {
    let d = initDraft({ q: 'Q', type: 'single', o: ['a', 'b', 'c', 'd'], c: 1 });
    d = switchDraftType(d, 'short'); assert.equal(d.q, 'Q'); assert.deepEqual(d.o, ['a', 'b', 'c', 'd']); assert.ok(validateDraft(d).length);
    d = { ...d, answerType: 'text', accepted: 'Hà Nội\nHa Noi' }; assert.deepEqual(validateDraft(d), []);
    const f = draftToFields(d); assert.deepEqual([f.type, f.c, f.answerType, f.acceptedAnswers], ['short', 'Hà Nội', 'text', ['Hà Nội', 'Ha Noi']]);
    d = switchDraftType(d, 'essay'); d = { ...d, rubricText: 'Ý 1 (2 điểm)\nÝ 2', maxScore: '3', sampleAnswer: 'mẫu' };
    const e = draftToFields(d); assert.deepEqual([e.type, e.o, e.c, e.maxScore, e.sampleAnswer], ['essay', [], '', 3, 'mẫu']); assert.equal(e.rubric.length, 2);
    assert.deepEqual(validateDraft({ ...d, maxScore: '0' }).length, 1);
    d = switchDraftType(d, 'single'); assert.deepEqual(d.o, ['a', 'b', 'c', 'd']);                          // lựa chọn cũ vẫn còn
    const back = initDraft({ ...e, imageIds: [] }); assert.match(back.rubricText, /Ý 1 \(2 điểm\)/); assert.equal(back.maxScore, '3');
    const num = draftToFields({ ...initDraft({ q: 'N', type: 'numeric', o: [], c: '12.5' }), tolerance: '0.1' });
    assert.deepEqual([num.type, num.answerType, num.c, num.tolerance], ['short', 'number', '12.5', 0.1]);
});

test('P2-8 dữ liệu lưu: không còn tên multi/numeric ở dữ liệu mới; câu có ảnh gán lại sau khi xóa', async () => {
    const r = await run(['PHẦN II. ĐÚNG / SAI', 'Câu 1: Mỗi ý đúng hay sai?', 'A. a', 'B. b', 'Đáp án: A Đ, B S', 'PHẦN III. TRẢ LỜI NGẮN', 'Câu 1: Số?', IMG('z1'), 'Đáp án: 5']);
    const fin = finalizeQuestions(r.state, dataOf); assert.ok(fin.every(q => !['multi', 'numeric'].includes(q.type)));
    let st = r.state; const imgId = st.questions[1].imageIds[0]; st = deleteQuestion(st, 1, 'unassign'); assert.equal(st.unresolved[0].id, imgId);
    st = assignImage(st, imgId, 0); assert.equal(st.questions[0].imageIds[0], imgId); assert.equal(st.unresolved.length, 0);
});
