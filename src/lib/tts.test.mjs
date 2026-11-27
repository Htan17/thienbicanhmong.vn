import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreVoice, pickVoice, speechText } from './tts.js';

const V = (name, lang, extra = {}) => ({ name, lang, ...extra });
test('chọn giọng đúng ngôn ngữ, ưu tiên giọng neural/online', () => {
    const vs = [V('eSpeak English', 'en-US'), V('Microsoft Zira', 'en-US'), V('Microsoft Aria Online (Natural)', 'en-US'), V('Google 日本語', 'ja-JP')];
    assert.equal(pickVoice(vs, 'en-US').name, 'Microsoft Aria Online (Natural)');
});
test('khớp vùng (en-GB) hơn chỉ khớp ngôn ngữ', () => {
    const vs = [V('Google US English', 'en-US'), V('Google UK English Female', 'en-GB')];
    assert.equal(pickVoice(vs, 'en-GB').lang, 'en-GB');
});
test('không có giọng cùng ngôn ngữ -> null (không đọc bằng giọng sai ngôn ngữ)', () => {
    assert.equal(pickVoice([V('Google 日本語', 'ja-JP')], 'en-US'), null);
    assert.equal(pickVoice([], 'en-US'), null);
});
test('chấp nhận lang dạng en_US và giọng yếu bị hạ điểm', () => {
    assert.ok(scoreVoice(V('Alex', 'en_US'), 'en-US') >= 100);
    assert.ok(scoreVoice(V('eSpeak', 'en-US'), 'en-US') < scoreVoice(V('Alex', 'en-US'), 'en-US'));
});
test('speechText bỏ chú thích và ký hiệu', () => {
    assert.equal(speechText('run (v) / sprint'), 'run , sprint');
    assert.equal(speechText('  hello   world '), 'hello world');
    assert.equal(speechText(null), '');
});
