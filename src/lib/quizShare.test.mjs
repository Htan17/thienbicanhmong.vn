import test from 'node:test';
import assert from 'node:assert/strict';
import { publishQuizShare, fetchQuizShare, normalizeShareCode, isShortQuizCode } from './quizShare.js';

const fakeFs = () => { const db = {}; return { db, collection: () => ({ doc: (id) => ({ get: async () => ({ exists: id in db, data: () => db[id] }), set: async (v) => { db[id] = v; } }) }) }; };
test('publish tạo mã 8 ký tự và lưu đúng cấu trúc cũ', async () => {
    const fs = fakeFs(); const code = await publishQuizShare(fs, 'u1', 'Tiêu đề', [{ q: 'a' }]);
    assert.ok(isShortQuizCode(code)); assert.deepEqual(Object.keys(fs.db[code]).sort(), ['createdAt', 'd', 'owner', 't']); assert.equal(fs.db[code].owner, 'u1');
});
test('fetch lấy lại đúng, chấp nhận chữ thường/khoảng trắng/gạch', async () => {
    const fs = fakeFs(); const code = await publishQuizShare(fs, 'u1', 'T', [{ q: 1 }]);
    const r = await fetchQuizShare(fs, ' ' + code.slice(0, 4).toLowerCase() + '-' + code.slice(4) + ' ');
    assert.equal(r.t, 'T'); assert.equal(r.code, code);
});
test('fetch báo lỗi mã sai/không tồn tại', async () => {
    const fs = fakeFs();
    await assert.rejects(() => fetchQuizShare(fs, '123'), { code: 'bad-code' });
    await assert.rejects(() => fetchQuizShare(fs, 'ABCDEFGH'), { code: 'not-found' });
});
test('normalize', () => assert.equal(normalizeShareCode(' ab cd-ef '), 'ABCDEF'));
