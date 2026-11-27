import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExamplePrompt, parseExample } from './aiExample.js';

test('prompt chứa từ, nghĩa và yêu cầu JSON', () => {
    const p = buildExamplePrompt({ original: 'relation', translated: 'quan hệ', partOfSpeech: 'noun' }, 'Tiếng Anh');
    assert.match(p, /"relation"/); assert.match(p, /quan hệ/); assert.match(p, /JSON/);
});
test('parse JSON sạch và JSON bọc ```', () => {
    assert.deepEqual(parseExample('{"s":"We have a good relation.","vi":"Chúng tôi có quan hệ tốt."}', 'relation'), { s: 'We have a good relation.', vi: 'Chúng tôi có quan hệ tốt.' });
    assert.equal(parseExample('```json\n{"s":"A relation.","vi":"x"}\n```', 'relation').s, 'A relation.');
});
test('từ chối: không phải JSON, thiếu câu, câu không chứa từ', () => {
    assert.equal(parseExample('xin lỗi tôi không biết', 'relation'), null);
    assert.equal(parseExample('{"s":"","vi":"x"}', 'relation'), null);
    assert.equal(parseExample('{"s":"We are friends.","vi":"x"}', 'relation'), null);
});
test('không cần word thì chỉ kiểm tra có câu', () => assert.equal(parseExample('{"s":"Hello there","vi":""}').s, 'Hello there'));
