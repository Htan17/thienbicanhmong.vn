import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDirectives, parseVocabText, swapColumns, looksMessy, buildAiPrompt, parseAiVocabJson, normLang } from './vocabImport.js';
import { pickMode } from './srsTyping.js';
const pairs = (r) => r.items.map(i => i.original + '>' + i.translated);

test('cấu trúc lệnh @: tên, ngôn ngữ, hướng, tách, luyện; lệnh lạ bị bỏ qua', () => {
  const d = parseDirectives('@Ten: Bài 1\n@ngonngu: trung\n@huong: nghia-goc\n@tach: tab\n@luyen: word\n@xyz: 1\nhello = xin chào');
  assert.equal(d.title, 'Bài 1'); assert.equal(d.lang, 'Tiếng Trung'); assert.equal(d.dir, 'nghia-goc'); assert.equal(d.sep, '\t'); assert.equal(d.mode, 'WORD');
  assert.deepEqual(d.unknown, ['xyz']); assert.equal(d.body.trim(), 'hello = xin chào');
  assert.equal(parseDirectives('@luyen: abc').mode, 'BOTH'); assert.equal(parseDirectives('@huong: vi-en').dir, 'nghia-goc'); assert.equal(parseDirectives('@huong: en-vi').dir, 'goc-nghia');
  assert.equal(normLang('Pháp'), 'Tiếng Pháp'); assert.equal(normLang('anh'), 'Tiếng Anh / Latinh');
});

test('ví dụ của người dùng: nghĩa "in" ↔ từ "print" (từ gốc đứng trước)', () => {
  const r = parseVocabText('print = in\nhello = xin chào\nbook = quyển sách');
  assert.deepEqual(pairs(r), ['print>in', 'hello>xin chào', 'book>quyển sách']);
});

test('tự nhận cột nghĩa tiếng Việt khi cột 1 là nghĩa (cả dòng không dấu như "in")', () => {
  const r = parseVocabText('xin chào = hello\nquyển sách = book\nin = print');
  assert.deepEqual(pairs(r), ['hello>xin chào', 'book>quyển sách', 'print>in']);
});

test('@huong ghi đè nhận diện tự động', () => {
  assert.deepEqual(pairs(parseVocabText('@huong: nghia-goc\nin = print\nmở = open')), ['print>in', 'open>mở']);
  assert.deepEqual(pairs(parseVocabText('@huong: goc-nghia\nin = print')), ['in>print']);
});

test('nhiều ký tự tách: tab, gạch, | , :, CSV có ngoặc kép, số thứ tự và dấu đầu dòng', () => {
  assert.deepEqual(pairs(parseVocabText('1. apple\tquả táo\n2. dog\tcon chó')), ['apple>quả táo', 'dog>con chó']);
  assert.deepEqual(pairs(parseVocabText('- cat - con mèo\n- run – chạy')), ['cat>con mèo', 'run>chạy']);
  assert.deepEqual(pairs(parseVocabText('| tree | cái cây |\n|---|---|\n| sun | mặt trời |')), ['tree>cái cây', 'sun>mặt trời']);
  assert.deepEqual(pairs(parseVocabText('go: đi\nsee: nhìn')), ['go>đi', 'see>nhìn']);
  assert.deepEqual(pairs(parseVocabText('word,meaning\n"hello, world",xin chào thế giới\nbye,tạm biệt')), ['hello, world>xin chào thế giới', 'bye>tạm biệt']);
});

test('dòng tiêu đề/ghi chú và dòng thiếu cột bị bỏ qua; trùng từ gộp nghĩa', () => {
  const r = parseVocabText('TỪ VỰNG BÀI 1\nprint = in\nprint = in ấn\nnote\nhello = xin chào');
  assert.deepEqual(pairs(r), ['print>in; in ấn', 'hello>xin chào']); assert.ok(r.skipped.includes('TỪ VỰNG BÀI 1'));
});

test('loại từ, phiên âm IPA, cột ví dụ, nghĩa thứ hai', () => {
  const a = parseVocabText('print (v) /prɪnt/ = in\nopen (v) = mở').items;
  assert.equal(a[0].pos, 'v'); assert.equal(a[0].pinyin, '/prɪnt/'); assert.equal(a[0].original, 'print'); assert.equal(a[1].pos, 'v');
  const b = parseVocabText('run\tchạy\tv\tI run every day.\nsit\tngồi\tv\tPlease sit down here.').items;
  assert.equal(b[0].pos, 'v'); assert.equal(b[0].example, 'I run every day.'); assert.equal(b[0].translated, 'chạy');
  assert.equal(parseVocabText('bank, ngân hàng, bờ sông\nlake, hồ').items[0].translated, 'ngân hàng; bờ sông');
  // dòng lẻ dùng ký tự tách khác vẫn được nhận
  assert.deepEqual(pairs(parseVocabText('a = b nghĩa\nc = d nghĩa\ne\tf nghĩa')), ['a>b nghĩa', 'c>d nghĩa', 'e>f nghĩa']);
});

test('tiếng Trung: [chữ Hán, pinyin, nghĩa] và [chữ Hán, nghĩa, pinyin]; ngôn ngữ tự nhận', () => {
  const r = parseVocabText('你好\tnǐ hǎo\txin chào\n谢谢\tcảm ơn\txièxie');
  assert.deepEqual(pairs(r), ['你好>xin chào', '谢谢>cảm ơn']); assert.equal(r.items[0].pinyin, 'nǐ hǎo'); assert.equal(r.items[1].pinyin, 'xièxie'); assert.equal(r.lang, 'Tiếng Trung');
});

test('chữ Nhật/Hàn đứng cột nào cũng nhận là từ gốc; dòng chỉ có phiên âm không có nghĩa bị loại', () => {
  assert.deepEqual(pairs(parseVocabText('xin chào = こんにちは\n사랑 = tình yêu')), ['こんにちは>xin chào', '사랑>tình yêu']);
  assert.equal(parseVocabText('你好 = nǐ hǎo').items.length, 0);
});

test('giới hạn độ dài & số lượng, file rỗng', () => {
  assert.equal(parseVocabText('').items.length, 0);
  const big = Array.from({ length: 600 }, (_, i) => `w${i} = nghĩa ${i}`).join('\n');
  const r = parseVocabText(big); assert.equal(r.items.length, 500); assert.ok(r.skipped.some(x => x.includes('vượt giới hạn')));
  assert.equal(parseVocabText('a'.repeat(100) + ' = ngắn').items.length, 0);
});

test('swapColumns & looksMessy', () => {
  assert.deepEqual(swapColumns([{ original: 'in', translated: 'print' }]).map(i => i.original + '>' + i.translated), ['print>in']);
  assert.ok(looksMessy(parseVocabText('Đây là một đoạn văn bình thường không có từ vựng gì cả.\nDòng thứ hai cũng vậy thôi.')));
  assert.ok(!looksMessy(parseVocabText('a = b\nc = d')));
});

test('AI: prompt chứa lệnh người dùng; parse JSON có rào ```, lọc trùng/sai', () => {
  const p = buildAiPrompt('@ngonngu: Tiếng Pháp\n@chude: Du lịch\nbonjour xin chào');
  assert.ok(p.includes('Tiếng Pháp') && p.includes('Du lịch') && p.includes('bonjour') && !p.includes('@ngonngu'));
  const r = parseAiVocabJson('Đây:\n```json\n{"title":"Bài 1","lang":"anh","items":[{"original":"print","translated":"in","pos":"V"},{"original":"print","translated":"in"},{"original":"x","translated":"x"},{"original":"","translated":"y"},5]}\n```');
  assert.equal(r.title, 'Bài 1'); assert.equal(r.lang, 'Tiếng Anh / Latinh'); assert.equal(r.items.length, 1); assert.equal(r.items[0].pos, 'v');
  assert.deepEqual(parseAiVocabJson('không phải json').items, []);
});

test('pickMode BOTH xen kẽ hai chiều theo số lần ôn', () => {
  assert.equal(pickMode({ reps: 0 }, 'BOTH'), 'WORD'); assert.equal(pickMode({ reps: 1 }, 'BOTH'), 'MEANING'); assert.equal(pickMode({ reps: 2 }, 'BOTH'), 'WORD');
});
