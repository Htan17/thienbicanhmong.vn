import test from 'node:test';
import assert from 'node:assert/strict';
import { PATH_STAGES, stageMode, pathBatch, pathSummary, sessionPathPct, clampLs, judgeMeaning, judgeOriginal, checkAnswer, blankSentence, canCloze, pickMode, buildQuizFromCards, streakProgress, pct, maskWords } from './srsTyping.js';

const C = (id, original, translated, x = {}) => ({ id, original, translated, reviewLevel: 0, ...x });
const pool = [
  C('1', 'apple', 'quả táo', { example: 'I eat an apple every day.' }),
  C('2', 'banana', 'quả chuối', { example: 'A banana is yellow.' }),
  C('3', 'orange', 'quả cam'),
  C('4', 'grape', 'quả nho'),
  C('5', 'lemon', 'quả chanh'),
  C('6', '你好', 'xin chào', { pinyin: 'nǐ hǎo', example: '你好，我是学生。' })
];

test('judgeMeaning: bỏ dấu, gần đúng, nhiều nghĩa', () => {
  assert.ok(judgeMeaning('qua tao', 'quả táo'));
  assert.ok(judgeMeaning('xin chao', 'xin chào; chào bạn'));
  assert.ok(!judgeMeaning('', 'quả táo'));
  assert.ok(!judgeMeaning('con mèo', 'quả táo'));
});

test('judgeOriginal: Latin, bỏ dấu, lỗi 1 ký tự, CJK, pinyin', () => {
  assert.ok(judgeOriginal('Apple', pool[0]));
  assert.ok(judgeOriginal('  apple. ', pool[0]));
  assert.ok(!judgeOriginal('appel', pool[0]), 'từ ngắn (<6) không được sai 1 ký tự');
  assert.ok(judgeOriginal('bananaa', pool[1]), 'từ >= 6 ký tự cho phép sai 1 ký tự');
  assert.ok(judgeOriginal('cafe', C('x', 'café', 'cà phê')));
  assert.ok(judgeOriginal('你好', pool[5]));
  assert.ok(!judgeOriginal('您好', pool[5]));
  assert.ok(judgeOriginal('ni hao', pool[5]), 'pinyin không dấu thanh được chấp nhận');
  assert.ok(judgeOriginal('nǐ hǎo', pool[5]));
  assert.ok(judgeOriginal('bar', C('y', 'bar (pub)', 'quán')), 'một trong các dạng trong ngoặc');
  assert.ok(!judgeOriginal('', pool[0]));
});

test('checkAnswer chọn đúng bộ chấm theo chế độ', () => {
  assert.ok(checkAnswer('MEANING', 'qua tao', pool[0]));
  assert.ok(!checkAnswer('MEANING', 'apple', pool[0]));
  assert.ok(checkAnswer('WORD', 'apple', pool[0]));
  assert.ok(checkAnswer('SENTENCE', 'apple', pool[0]));
});

test('blankSentence / canCloze / pickMode', () => {
  assert.equal(blankSentence('I eat an Apple.', 'apple').text, 'I eat an ＿＿＿.');
  assert.equal(blankSentence('Hello', 'apple').found, false);
  assert.equal(blankSentence('1+1 (a) b', '(a)').found, true, 'ký tự đặc biệt regex được escape');
  assert.ok(canCloze(pool[0])); assert.ok(!canCloze(pool[2]));
  assert.equal(pickMode(pool[2], 'SENTENCE'), 'WORD', 'không có câu ví dụ -> gõ từ');
  assert.equal(pickMode(pool[0], 'SENTENCE'), 'SENTENCE');
  assert.equal(pickMode({ ...pool[0], reviewLevel: 1 }, 'MIXED'), 'MEANING');
  assert.equal(pickMode({ ...pool[0], reviewLevel: 3 }, 'MIXED'), 'WORD');
  assert.equal(pickMode({ ...pool[0], reviewLevel: 6 }, 'MIXED'), 'SENTENCE');
  assert.equal(pickMode({ ...pool[2], reviewLevel: 6 }, 'MIXED'), 'WORD');
  assert.equal(maskWords('quả táo'), 'q··  t··');
  assert.equal(pickMode(pool[0], 'LISTEN'), 'LISTEN');
  assert.equal(pickMode(pool[0], 'LISTEN', { tts: false }), 'WORD', 'không có đọc tiếng -> gõ từ');
  assert.ok(checkAnswer('LISTEN', 'apple', pool[0]));
});

test('streakProgress & pct', () => {
  assert.deepEqual(streakProgress(0), { prev: 0, next: 3, pct: 0 });
  assert.equal(streakProgress(5).next, 7); assert.equal(streakProgress(5).pct, 50);
  assert.equal(streakProgress(400).next, null);
  assert.equal(pct(1, 0), 0); assert.equal(pct(5, 4), 100);
});

test('buildQuizFromCards: đúng định dạng Bí Tịch cũ, đáp án đúng nằm trong lựa chọn, không trùng', () => {
  const qs = buildQuizFromCards(pool, { count: 6, rng: (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() });
  assert.ok(qs.length >= 4);
  for (const q of qs) {
    assert.equal(q.type, 'single');
    assert.ok(q.o.length >= 3 && q.o.length <= 4);
    assert.equal(new Set(q.o).size, q.o.length, 'không có lựa chọn trùng');
    assert.ok(Number.isInteger(q.c) && q.c >= 0 && q.c < q.o.length);
    assert.ok(typeof q.q === 'string' && q.q.length > 5);
  }
  assert.equal(new Set(qs.map(q => q.q)).size, qs.length);
  const meaning = qs.find(q => q.q.startsWith('Nghĩa của "apple"'));
  if (meaning) assert.equal(meaning.o[meaning.c], 'quả táo');
  assert.ok(qs.some(q => q.q.startsWith('Điền từ còn thiếu')), 'có câu điền từ khi thẻ có câu ví dụ');
});

test('buildQuizFromCards: ít hơn 4 thẻ -> không sinh đề', () => {
  assert.deepEqual(buildQuizFromCards(pool.slice(0, 3)), []);
  assert.deepEqual(buildQuizFromCards([]), []);
  assert.deepEqual(buildQuizFromCards(null), []);
});

test('buildQuizFromCards: chỉ ra đề cho targets nhưng nhiễu lấy từ pool', () => {
  const qs = buildQuizFromCards([pool[0]], { count: 5, pool, kinds: ['meaning'] });
  assert.equal(qs.length, 1); assert.equal(qs[0].o[qs[0].c], 'quả táo');
});

test('Ải học thuộc: stageMode theo ải, ải 4 có/không có đọc tiếng', () => {
  assert.equal(PATH_STAGES.length, 4);
  assert.equal(stageMode(pool[0], 1), 'COPY'); assert.equal(stageMode(pool[0], 2), 'MEANING'); assert.equal(stageMode(pool[0], 3), 'WORD');
  assert.equal(stageMode(pool[0], 4), 'LISTEN'); assert.equal(stageMode(pool[0], 4, { tts: false }), 'SENTENCE'); assert.equal(stageMode(pool[2], 4, { tts: false }), 'WORD');
  assert.ok(checkAnswer('COPY', 'apple', pool[0])); assert.ok(!checkAnswer('COPY', 'quả táo', pool[0]));
});
test('Ải học thuộc: pathBatch ưu tiên từ học dở, bỏ từ đã thuộc, tối đa size', () => {
  const cs = [C('a', 'a', 'x', { ls: 0, createdAt: 1 }), C('b', 'b', 'x', { ls: 3, createdAt: 2 }), C('c', 'c', 'x', { ls: 4, createdAt: 3 }), C('d', 'd', 'x', { ls: 3, createdAt: 1 }), C('e', 'e', '', { ls: 0 })];
  assert.deepEqual(pathBatch(cs).map(c => c.id), ['d', 'b', 'a']);
  assert.equal(pathBatch(cs, 2).length, 2); assert.deepEqual(pathBatch(null), []);
});
test('Ải học thuộc: pathSummary & sessionPathPct & clampLs', () => {
  const s = pathSummary([{ ls: 0 }, { ls: 2 }, { ls: 4 }, { ls: 9 }, {}]);
  assert.deepEqual(s.st, [2, 0, 1, 0, 2]); assert.equal(s.done, 2); assert.equal(s.next, 1); assert.equal(s.pct, Math.round((0 + 2 + 4 + 4 + 0) / 20 * 100));
  assert.equal(pathSummary([{ ls: 4 }]).next, null); assert.equal(pathSummary([]).pct, 0);
  assert.equal(sessionPathPct({ a: 0, b: 2 }, { a: 2, b: 4 }), Math.round(4 / 6 * 100)); assert.equal(sessionPathPct({}, {}), 0); assert.equal(sessionPathPct({ a: 0 }, {}), 0);
  assert.equal(clampLs(-3), 0); assert.equal(clampLs(7), 4); assert.equal(clampLs('2'), 2);
});
