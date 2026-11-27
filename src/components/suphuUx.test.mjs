import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./SuPhuHub.jsx', import.meta.url), 'utf8');

test('ô gõ không còn gây tự cuộn trang (autoFocus + scrollIntoView khi focus)', () => {
    assert.ok(!/<input[^>]*\bautoFocus\b/.test(src), 'không dùng thuộc tính autoFocus');
    assert.ok(!/\.scrollIntoView\(/.test(src), 'không gọi scrollIntoView');
    assert.match(src, /focus\(\{ preventScroll: true \}\)/);
});
test('ô gõ và nút TIẾP THEO nằm trong thanh dính đáy', () => {
    const n = (src.match(/sticky bottom-0 z-10 bg-black\/95/g) || []).length;
    assert.equal(n, 2);
});
test('có ví dụ AI, chép mã, nhận mã và đọc chậm', () => {
    for (const k of ['TẠO VÍ DỤ BẰNG AI', 'CHÉP MÃ', 'Nhận Bí Tịch bằng mã', 'Đọc chậm', 'publishQuizShare', 'fetchQuizShare', 'SRS.setExample']) assert.ok(src.includes(k), k);
});
test('mọi âm thanh mới được dùng đều có định nghĩa trong audio.js', () => {
    const audio = readFileSync(new URL('../lib/audio.js', import.meta.url), 'utf8');
    for (const k of ['FLIP', 'STAGEUP', 'FANFARE', 'COPIED', 'MAGIC', 'SPARKLE']) { assert.ok(audio.includes(k + ':'), k + ' thiếu trong audio.js'); assert.ok(src.includes("'" + k + "'"), k + ' chưa được dùng'); }
});
