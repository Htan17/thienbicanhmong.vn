import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFS, normalizePrefs, shouldPlay, bgmVolumeFor, classifyClick, UI_KEYS, loadPrefs, savePrefs } from './audioPrefs.js';

test('normalizePrefs: mặc định bật hết, kẹp âm lượng 0..1, bỏ rác', () => {
  assert.deepEqual(normalizePrefs(null), DEFAULT_PREFS);
  assert.equal(normalizePrefs({ bgmVol: 5 }).bgmVol, 1); assert.equal(normalizePrefs({ sfxVol: -2 }).sfxVol, 0); assert.equal(normalizePrefs({ bgmVol: 'abc' }).bgmVol, DEFAULT_PREFS.bgmVol);
  assert.equal(normalizePrefs({ bgmOn: false }).sfxOn, true, 'tắt nhạc KHÔNG làm tắt hiệu ứng');
});

test('TẮT NHẠC không tắt hiệu ứng; tắt hiệu ứng thì tắt cả âm giao diện; tắt âm giao diện vẫn giữ đúng/sai', () => {
  const musicOff = { ...DEFAULT_PREFS, bgmOn: false };
  assert.ok(shouldPlay('CORRECT', musicOff) && shouldPlay('TAP', musicOff));
  const sfxOff = { ...DEFAULT_PREFS, sfxOn: false };
  assert.ok(!shouldPlay('CORRECT', sfxOff) && !shouldPlay('TAP', sfxOff));
  const uiOff = { ...DEFAULT_PREFS, uiOn: false };
  assert.ok(shouldPlay('CORRECT', uiOff) && shouldPlay('LEVELUP', uiOff) && shouldPlay('REWARD', uiOff));
  for (const k of ['TAP', 'CLICK', 'TYPE', 'TICK', 'TOGGLE', 'TAB', 'OPEN', 'CLOSE', 'SWOOSH', 'PRESS']) assert.ok(UI_KEYS.has(k) && !shouldPlay(k, uiOff), k);
});

test('bgmVolumeFor: hạ nhỏ khi xem video', () => {
  assert.equal(bgmVolumeFor({ ...DEFAULT_PREFS, bgmVol: 0.5 }, 'DASHBOARD'), 0.5);
  assert.ok(Math.abs(bgmVolumeFor({ ...DEFAULT_PREFS, bgmVol: 0.5 }, 'VIDEO_LEARN') - 0.1) < 1e-9);
});

test('classifyClick: mỗi loại nút một âm khác nhau', () => {
  assert.equal(classifyClick({ sfx: 'GACHA' }), 'GACHA');
  assert.equal(classifyClick({ tag: 'input', type: 'checkbox' }), 'TOGGLE');
  assert.equal(classifyClick({ role: 'tab', text: 'THỐNG KÊ' }), 'TAB');
  assert.equal(classifyClick({ tag: 'button', pressed: true, text: 'Gõ từ' }), 'TOGGLE');
  assert.equal(classifyClick({ tag: 'button', expanded: false, text: 'Cấu trúc lệnh' }), 'TOGGLE');
  assert.equal(classifyClick({ tag: 'button', text: '🗑' }), 'WARN'); assert.equal(classifyClick({ tag: 'button', text: 'Xoá bộ từ' }), 'WARN');
  assert.equal(classifyClick({ tag: 'button', text: '✕' }), 'CLOSE'); assert.equal(classifyClick({ tag: 'button', text: 'QUAY LẠI' }), 'CLOSE'); assert.equal(classifyClick({ tag: 'button', aria: 'Đóng' }), 'CLOSE');
  assert.equal(classifyClick({ tag: 'button', text: 'KIỂM TRA' }), 'PRESS'); assert.equal(classifyClick({ tag: 'button', text: 'x', cls: 'w-full bg-emerald-500 text-black' }), 'CLOSE');
  assert.equal(classifyClick({ tag: 'button', text: 'abc', cls: 'bg-emerald-500 text-black' }), 'PRESS');
  assert.equal(classifyClick({ tag: 'button', text: 'Hồ sơ' }), 'TAP'); assert.equal(classifyClick({ tag: 'label', type: 'file', text: 'Chọn tệp' }), 'OPEN');
  assert.equal(classifyClick(null), 'TAP');
});

test('load/save prefs qua localStorage (có try/catch)', () => {
  const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  assert.deepEqual(loadPrefs(), DEFAULT_PREFS); savePrefs({ bgmOn: false, bgmVol: 0.1, sfxOn: true, uiOn: false, sfxVol: 0.4 });
  assert.deepEqual(loadPrefs(), { bgmOn: false, sfxOn: true, uiOn: false, bgmVol: 0.1, sfxVol: 0.4 });
  store.tkbc_audio_v2 = '{hỏng'; assert.deepEqual(loadPrefs(), DEFAULT_PREFS);
});
