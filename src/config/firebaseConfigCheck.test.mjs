import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFirebaseConfig, isWellFormedApiKey } from './firebaseConfigCheck.js';

const good = { apiKey: 'AIza' + 'A'.repeat(35), authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:2:web:abc' };

test('cấu hình đầy đủ hợp lệ', () => assert.equal(validateFirebaseConfig(good).ok, true));
test('undefined/null/rỗng bị từ chối', () => {
  for (const c of [undefined, null, {}, { ...good, apiKey: '' }, { ...good, apiKey: null }, { ...good, projectId: '  ' }]) assert.equal(validateFirebaseConfig(c).ok, false);
});
test('placeholder bị từ chối', () => {
  for (const k of ['YOUR_API_KEY', '<api-key>', 'demo-api-key']) assert.equal(validateFirebaseConfig({ ...good, apiKey: k }).ok, false, k);
});
test('apiKey sai định dạng (thừa khoảng trắng, dấu nháy, thiếu ký tự)', () => {
  for (const k of [' ' + good.apiKey, good.apiKey + '"', good.apiKey.slice(0, 30), 'BIza' + 'A'.repeat(35)]) assert.equal(isWellFormedApiKey(k), false, k);
});
test('js/firebase-config.js đi kèm bản FULL qua kiểm tra định dạng', () => {
  const src = readFileSync(new URL('../../js/firebase-config.js', import.meta.url), 'utf8');
  const window = {}; new Function('window', src)(window);
  const r = validateFirebaseConfig(window.TKBC_FIREBASE_CONFIG);
  assert.deepEqual(r.problems, []);
  assert.equal(window.TKBC_FIREBASE_CONFIG.projectId, 'thienbicanhmong');
});
test('app.html nạp firebase-config.js TRƯỚC SDK Firebase và TRƯỚC app.min.js', () => {
  const h = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');
  const i = (s) => h.indexOf(s);
  assert.ok(i('js/firebase-config.js') > 0 && i('js/firebase-config.js') < i('firebase-app-compat.js'));
  assert.ok(i('firebase-app-compat.js') < i('js/app.min.js'));
  assert.equal((h.match(/firebase-app-compat\.js/g) || []).length, 1, 'SDK chỉ nạp một lần');
});
