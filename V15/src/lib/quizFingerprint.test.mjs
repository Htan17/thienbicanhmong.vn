import test from 'node:test';
import assert from 'node:assert/strict';
import { quizFingerprint } from './quizFingerprint.js';
test('quizFingerprint: bất biến theo thứ tự/khoảng trắng/hoa thường; khác nội dung thì khác', () => {
  const a = [{ q: 'Xin chào là gì?' }, { q: '  Cảm ơn  ' }]; const b = [{ q: 'cảm ơn' }, { q: 'xin chào là gì?' }];
  assert.equal(quizFingerprint(a), quizFingerprint(b));
  assert.notEqual(quizFingerprint(a), quizFingerprint([{ q: 'Xin chào là gì?' }, { q: 'Tạm biệt' }]));
  assert.match(quizFingerprint(a), /^[a-z0-9]{3,16}$/);
  assert.equal(typeof quizFingerprint(null), 'string');
});
