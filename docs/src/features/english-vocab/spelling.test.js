import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWord, isEnglishWord, strictSpellOk, spellVerdict, diffMarks } from './spelling.js';
import { checkAnswer } from '../../lib/srsTyping.js';

test('normalizeWord: bỏ hoa/thường + khoảng trắng thừa + nháy cong; giữ nháy/gạch nối thật', () => {
  assert.equal(normalizeWord('  Don’t   Go '), "don't go");
  assert.notEqual(normalizeWord('dont'), normalizeWord("don't"));
  assert.notEqual(normalizeWord('ice cream'), normalizeWord('ice-cream'));
  assert.equal(normalizeWord(null), '');
});
test('isEnglishWord: chữ cái A-Z, cho phép cụm từ; chặn ký tự lạ/HTML/CJK', () => {
  assert.ok(isEnglishWord("o'clock") && isEnglishWord('well-known') && isEnglishWord('ice cream'));
  assert.ok(!isEnglishWord('café') && !isEnglishWord('<b>x</b>') && !isEnglishWord('猫') && !isEnglishWord(''));
});
test('strictSpellOk: đúng từng chữ mới đúng (khác chấm mặc định cho phép lệch 1 ký tự)', () => {
  assert.ok(strictSpellOk(' Apple ', 'apple'));
  assert.ok(!strictSpellOk('aple', 'apple') && !strictSpellOk('', 'apple'));
  const card = { original: 'definitely', translated: 'chắc chắn' };
  assert.equal(checkAnswer('WORD', 'definately', card), true, 'chấm mặc định của REV3 chấp nhận lệch 1 ký tự (từ ≥6 chữ)');
  assert.equal(strictSpellOk('definately', card.original), false, 'chấm chặt thì không');
});
test('spellVerdict: exact / near / wrong / empty', () => {
  assert.deepEqual(['apple', 'aple', 'banana', '  '].map((x) => spellVerdict(x, 'apple')), ['exact', 'near', 'wrong', 'empty']);
});
test('diffMarks: độ dài = đáp án, đánh dấu đúng chữ thiếu', () => {
  const m = diffMarks('aple', 'apple');
  assert.equal(m.map((x) => x.ch).join(''), 'apple'); assert.equal(m.filter((x) => !x.ok).length, 1);
  assert.ok(diffMarks('apple', 'apple').every((x) => x.ok)); assert.ok(diffMarks('', 'cat').every((x) => !x.ok));
  const d = diffMarks('definately', 'definitely'); assert.equal(d.length, 10); assert.equal(d.filter((x) => !x.ok).length, 1);
});
