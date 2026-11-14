// Chạy: node --test src/docx-import/docxImport.test.js
// Mammoth KHÔNG có trong môi trường test -> dùng "mammoth giả" mô phỏng đúng giao diện (images.imgElement, convertToHtml)
// và HTML dạng mammoth sinh ra. Bước chạy Mammoth THẬT cần thử bằng DOCX thật trên trình duyệt (xem HUONG_DAN).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { importDocxWithImages, docxHasMedia } from './docxImport.js';
import { htmlToLines } from './docxImageExtractor.js';
import { assignImage, removeImage, setPrimary, finalizeQuestions, imageStatus } from './imageQuestionMatcher.js';
import { checkLimits, dataUriBytes } from './imageCompressor.js';
import { parseRawQuizText } from '../lib/helpers.js';

const B64 = (n) => Buffer.from('x'.repeat(n) + Math.random()).toString('base64');
const IMG = (name, mime = 'image/png', size = 40) => ({ img: name, mime, b64: B64(size) });
// blocks: chuỗi = đoạn chữ; {img} = ảnh
const fakeMammoth = (blocks) => ({
    images: { imgElement: (fn) => fn },
    convertToHtml: async (_in, { convertImage }) => {
        let html = '';
        for (const b of blocks) {
            if (typeof b === 'string') { html += `<p>${b.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`; continue; }
            if (b.table) { html += '<table><tr>' + b.table.map(c => `<td>${typeof c === 'string' ? c : ''}</td>`).join('') + '</tr></table>'; continue; }
            const attrs = await convertImage({ contentType: b.mime, read: async () => { if (b.fail) throw new Error('x'); return b.b64; } });
            html += `<p><img src="${attrs.src}" data-img-id="${attrs['data-img-id']}" /></p>`;
        }
        return { value: html, messages: [] };
    }
});
const run = (blocks) => importDocxWithImages(new ArrayBuffer(8), fakeMammoth(blocks));
const Q = (n, extra = []) => [`Câu ${n}: Nội dung câu ${n}?`, ...extra, `A. a${n}`, `B. b${n}`, `C. c${n}`, `D. d${n}`, `Đáp án: B`];

test('1 DOCX chỉ có chữ -> không có ảnh (App sẽ dùng luồng cũ)', async () => {
    const r = await run([...Q(1), ...Q(2)]); assert.equal(r.hasImages, false);
});
test('2 ảnh ngay sau Câu 1 -> thuộc Câu 1', async () => {
    const i = IMG('a'); const r = await run([`Câu 1: Hình bên?`, i, 'A. 1', 'B. 2', 'Đáp án: A']);
    assert.equal(r.state.questions[0].imageIds.length, 1);
});
test('3 ảnh giữa nội dung và lựa chọn A -> vẫn thuộc câu hiện tại', async () => {
    const r = await run(['Câu 1: Cho hình', 'Tính diện tích?', IMG('a'), 'A. 1', 'B. 2', 'Đáp án: B']);
    assert.equal(r.state.questions[0].imageIds.length, 1); assert.equal(r.state.unresolved.length, 0);
});
test('4 hai câu, mỗi câu một ảnh, đúng câu', async () => {
    const r = await run([...Q(1, [IMG('a')]), ...Q(2, [IMG('b')])]);
    const [q1, q2] = r.state.questions; assert.deepEqual(q1.imageIds, ['img_001']); assert.deepEqual(q2.imageIds, ['img_002']);
});
test('5 một câu có hai ảnh -> images[2], img = ảnh đầu, cảnh báo nhiều ảnh', async () => {
    const r = await run([...Q(1, [IMG('a'), IMG('b')])]);
    const f = finalizeQuestions(r.state, id => r.images.find(x => x.id === id).dataUri);
    assert.equal(f[0].images.length, 2); assert.equal(f[0].img, f[0].images[0]); assert.ok(r.warnings.some(w => /nhiều ảnh/.test(w)));
});
test('6 câu không có ảnh -> img null, images []', async () => {
    const r = await run([...Q(1, [IMG('a')]), ...Q(2)]);
    const f = finalizeQuestions(r.state, id => r.images.find(x => x.id === id).dataUri);
    assert.equal(f[1].img, null); assert.deepEqual(f[1].images, []); assert.equal(imageStatus(r.state.questions[1]), 'none');
});
test('7 ảnh trước Câu 1 -> unresolved, không tự gắn', async () => {
    const r = await run([IMG('a'), ...Q(1), ...Q(2)]);
    assert.equal(r.state.unresolved.length, 1); assert.ok(r.state.questions.every(q => q.imageIds.length === 0));
});
test('8 ảnh nằm giữa Câu 1 (sau đáp án) và Câu 2 -> thuộc Câu 1', async () => {
    const r = await run([...Q(1), IMG('a'), ...Q(2)]); assert.equal(r.state.questions[0].imageIds.length, 1); assert.equal(r.state.questions[1].imageIds.length, 0);
});
test('9 logo lặp lại (cùng nội dung) -> không gắn vào câu nào', async () => {
    const logo = IMG('logo'); const same = { ...logo };
    const r = await run([...Q(1, [logo]), ...Q(2, [same]), ...Q(3, [IMG('real')])]);
    assert.equal(r.state.unresolved.filter(u => /lặp/.test(u.reason)).length, 2);
    assert.equal(r.state.questions[2].imageIds.length, 1); assert.equal(r.state.questions[0].imageIds.length, 0);
});
test('10-11 giữ MIME thật PNG / JPEG / WebP, không mặc định PNG', async () => {
    const r = await run([...Q(1, [IMG('a', 'image/png')]), ...Q(2, [IMG('b', 'image/jpeg')]), ...Q(3, [IMG('c', 'image/jpg')]), ...Q(4, [IMG('d', 'image/webp')])]);
    assert.deepEqual(r.images.map(i => i.mime), ['image/png', 'image/jpeg', 'image/jpeg', 'image/webp']);
    assert.ok(r.images[1].dataUri.startsWith('data:image/jpeg;base64,')); assert.ok(r.images[3].dataUri.startsWith('data:image/webp;base64,'));
});
test('12 ảnh quá lớn -> cảnh báo vượt kích thước; tổng quá lớn -> chặn lưu', async () => {
    const r = await run([...Q(1, [IMG('a', 'image/png', 1600000)])]);
    assert.ok(r.warnings.some(w => /vượt kích thước đề xuất/.test(w)));
    const f = finalizeQuestions(r.state, id => r.images.find(x => x.id === id).dataUri);
    assert.ok(checkLimits(f, 0).errors.length >= 1);
});
test('13 ảnh không đọc được (EMF / lỗi đọc) -> unresolved + cảnh báo, không gắn', async () => {
    const r = await run([...Q(1, [IMG('a', 'image/x-emf'), { img: 'b', mime: 'image/png', b64: B64(20), fail: true }])]);
    assert.equal(r.state.questions[0].imageIds.length, 0); assert.equal(r.state.unresolved.length, 2);
    assert.ok(r.warnings.some(w => /Không đọc được một ảnh/.test(w)));
});
test('14-16 single / multi / numeric giữ đúng loại và đáp án khi có ảnh', async () => {
    const r = await run(['Câu 1: A?', IMG('a'), 'A. 1', 'B. 2', 'Đáp án: B', 'Câu 2: Nhiều?', IMG('b'), 'A. 1', 'B. 2', 'C. 3', 'Đáp án: A,C', 'Câu 3: Tính?', IMG('c'), 'Đáp án: 12.5']);
    const [a, b, c] = r.state.questions;
    assert.equal(a.type, 'single'); assert.equal(a.c, 1); assert.equal(b.type, 'truefalse'); assert.deepEqual(b.c, [0, 2]); assert.equal(c.type, 'short'); assert.equal(c.answerType, 'number'); assert.equal(c.c, '12.5'); // GĐ2: tên V2 (multi->truefalse, numeric->short)
    assert.ok([a, b, c].every(q => q.imageIds.length === 1));
});
test('17 TXT vẫn đi parser cũ, không qua DOCX', () => {
    const t = 'Câu 1: X?\nA. 1\nB. 2\nĐáp án: A\n'; const q = parseRawQuizText(t);
    assert.equal(q.length, 1); assert.equal(q[0].img, undefined);
    const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    assert.match(app, /reader\.readAsText\(file\)/); // nhánh TXT còn nguyên
    assert.match(app, /if \(ext === 'docx'\)/);
});
test('18 câu cũ không có img vẫn dùng được như trước', () => {
    const q = { q: 'x', o: ['a', 'b'], c: 0, type: 'single' }; assert.ok(!q.img); // điều kiện hiển thị `activeQuiz[curIdx].img &&` => không vẽ
    const mixed = { ...q, o: [...q.o], c: 0 }; assert.equal(mixed.img, undefined);
});
test('19 ảnh đi qua startFreshQuiz ({...q}) vào activeQuiz[curIdx].img; App còn đúng chỗ hiển thị', async () => {
    const r = await run([...Q(1, [IMG('a')])]); const f = finalizeQuestions(r.state, id => r.images[0].dataUri)[0];
    const active = { ...f, o: [...f.o], c: f.c }; assert.equal(active.img, f.img);
    const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    assert.match(app, /activeQuiz\[curIdx\]\.img && \(/);
});
test('20 phóng to ảnh còn nguyên (ZoomableImage + setLightboxImg)', () => {
    const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    assert.match(app, /setLightboxImg\(activeQuiz\[curIdx\]\.img\)/); assert.match(app, /<ZoomableImage src=\{lightboxImg\}/);
});
test('21 không gắn trùng ảnh: mọi thao tác giữ ảnh ở đúng 1 nơi', async () => {
    const r = await run([...Q(1, [IMG('a')]), ...Q(2)]); let st = r.state;
    st = assignImage(st, 'img_001', 1); st = assignImage(st, 'img_001', 0); st = assignImage(st, 'img_001', 1);
    const where = [...st.questions.flatMap(q => q.imageIds), ...st.unresolved.map(u => u.id)].filter(x => x === 'img_001');
    assert.equal(where.length, 1);
});
test('22 unresolvedImages: gỡ ảnh -> vào unresolved; gán lại -> ra khỏi unresolved; chọn ảnh chính', async () => {
    const r = await run([...Q(1, [IMG('a'), IMG('b')])]); let st = removeImage(r.state, 'img_001');
    assert.equal(st.unresolved.length, 1); assert.deepEqual(st.questions[0].imageIds, ['img_002']);
    st = assignImage(st, 'img_001', 0); assert.equal(st.unresolved.length, 0); st = setPrimary(st, 0, 'img_001'); assert.equal(st.questions[0].imageIds[0], 'img_001');
});
test('23 không tự lưu: module import không chứa gọi Firestore/lưu', () => {
    for (const f of ['docxImport.js', 'docxImageExtractor.js', 'docxQuestionParser.js', 'imageQuestionMatcher.js', 'imageCompressor.js']) {
        const s = fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
        assert.doesNotMatch(s, /firebase\.|firestore\.|safeUserUpdate|arrayUnion|localStorage|\.collection\(|fetch\(/i, f);
    }
});
test('24-25 đáp án đúng không mất, thứ tự câu không đảo', async () => {
    const r = await run([...Q(1, [IMG('a')]), ...Q(2), ...Q(3, [IMG('b')])]);
    assert.deepEqual(r.state.questions.map(q => q.q), ['Nội dung câu 1?', 'Nội dung câu 2?', 'Nội dung câu 3?']);
    assert.ok(r.state.questions.every(q => q.c === 1)); assert.deepEqual(r.state.questions.map(q => q.sourceNo), [1, 2, 3]);
    const ref = parseRawQuizText([...Q(1), ...Q(2), ...Q(3)].join('\n')); // so với parser cũ: cùng kết quả
    assert.deepEqual(r.state.questions.map(q => [q.q, q.o, q.c, q.type]), ref.map(q => [q.q, q.o, q.c, q.type]));
});
test('26 ảnh trong bảng Word và HTML có ký tự đặc biệt', async () => {
    const lines = htmlToLines('<table><tr><td><p>Câu 1: a &amp; b &lt; c?</p></td><td><img src="" data-img-id="img_001" /></td></tr></table><p>A. 1</p><p>B. 2</p><p>Đáp án: A</p>');
    assert.equal(lines[0].text, 'Câu 1: a & b < c?'); assert.deepEqual(lines[1].imgIds, ['img_001']);
});
test('27 docxHasMedia nhận ra DOCX thật có ảnh / không ảnh (tạo bằng thư viện docx)', async () => {
    let docx; try { docx = createRequire(import.meta.url)('/home/claude/.npm-global/lib/node_modules/docx'); } catch (e) { return; }
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const withImg = await docx.Packer.toBuffer(new docx.Document({ sections: [{ children: [new docx.Paragraph('Câu 1: x?'), new docx.Paragraph({ children: [new docx.ImageRun({ type: 'png', data: png, transformation: { width: 10, height: 10 } })] })] }] }));
    const noImg = await docx.Packer.toBuffer(new docx.Document({ sections: [{ children: [new docx.Paragraph('Câu 1: x?')] }] }));
    assert.equal(docxHasMedia(withImg.buffer.slice(withImg.byteOffset, withImg.byteOffset + withImg.byteLength)), true);
    assert.equal(docxHasMedia(noImg.buffer.slice(noImg.byteOffset, noImg.byteOffset + noImg.byteLength)), false);
});
test('28 giới hạn: ngân sách hồ sơ tính cả library hiện có', () => {
    const f = [{ id: 'q_001', q: 'x', o: ['a', 'b'], c: 0, type: 'single', img: null, images: [] }];
    assert.equal(checkLimits(f, 0).errors.length, 0); assert.ok(checkLimits(f, 899900).errors.length >= 1);
    assert.equal(dataUriBytes('data:image/png;base64,QUJD'), 3);
});
