// Kiểm tra môi trường + cấu trúc dự án TRƯỚC khi build/deploy. Mỗi mục in PASS/FAIL/WARN có lý do thật.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(root, ...a);
const readJson = (f) => JSON.parse(readFileSync(P(f), 'utf8'));
let fail = 0, warn = 0;
const out = (s, name, msg = '') => { if (s === 'FAIL') fail++; if (s === 'WARN') warn++; console.log(`${s.padEnd(4)}  ${name}${msg ? ' — ' + msg : ''}`); };

// Node
const want = existsSync(P('.nvmrc')) ? readFileSync(P('.nvmrc'), 'utf8').trim() : null;
const have = process.versions.node;
if (!want) out('FAIL', 'Node', 'thiếu .nvmrc');
else if (have.split('.')[0] !== want.split('.')[0]) out('FAIL', 'Node', `đang dùng v${have}, dự án chuẩn hoá Node ${want}.x (Functions chạy nodejs22). Cài Node ${want} (vd. nvm-windows) rồi chạy lại.`);
else out('PASS', 'Node', `v${have}`);

// engines đồng bộ
try {
  const a = readJson('package.json').engines?.node, b = readJson('functions/package.json').engines?.node;
  out(a && b && String(a).includes(want?.split('.')[0]) && String(b) === want?.split('.')[0] ? 'PASS' : 'FAIL', 'engines đồng bộ', `root=${a} functions=${b} .nvmrc=${want}`);
} catch (e) { out('FAIL', 'engines', e.message); }

// Lockfile (kiểm tra từng file riêng)
for (const f of ['package-lock.json', 'functions/package-lock.json']) existsSync(P(f)) ? out('PASS', f) : out('FAIL', f, 'chưa có — chạy `npm install` (có mạng) ở thư mục tương ứng rồi commit; KHÔNG tạo tay');
// node_modules
for (const d of ['node_modules', 'functions/node_modules']) existsSync(P(d)) ? out('PASS', d, 'đã cài') : out('WARN', d, 'chưa cài (npm ci)');

// File bắt buộc
for (const f of ['src/main.jsx', 'index.html', 'firebase.json', 'firebase.emulator-full.json', 'firebase.emulator-hardened.json', 'firestore.rules', 'firestore.rules.hardened', 'firestore.indexes.json', 'functions/index.js', 'js/firebase-config.example.js', '.firebaserc.example', 'tools/build.mjs'])
  existsSync(P(f)) ? out('PASS', f) : out('FAIL', f, 'không tồn tại');

// Script trong package.json phải trỏ tới file có thật
try {
  const s = readJson('package.json').scripts || {};
  for (const [k, v] of Object.entries(s)) for (const m of String(v).matchAll(/(?:node|sh)\s+\.?\/?((?:tools|tests)\/[\w./-]+)/g))
    if (!existsSync(P(m[1]))) out('FAIL', `script "${k}"`, `trỏ tới ${m[1]} không tồn tại`);
  for (const k of ['build', 'test', 'test:all', 'check', 'emulators']) s[k] ? out('PASS', `script "${k}"`) : out('FAIL', `script "${k}"`, 'chưa khai báo');
} catch (e) { out('FAIL', 'package.json', e.message); }

// Không hardcode project của người bán trong code chạy (không xét tài liệu/ghi chú)
const sellerId = 'thienbicanhmong';
for (const f of ['src/config/firebase.js', 'js/firebase-config.example.js', '.env.example', 'firebase.json', '.firebaserc.example'])
  if (existsSync(P(f))) { const t = readFileSync(P(f), 'utf8'); /thienbicanhmong/.test(t) ? out('FAIL', f, `còn Project ID của người bán (${sellerId})`) : out('PASS', `${f} không hardcode project người bán`); }
if (existsSync(P('js/firebase-config.js'))) out(/thienbicanhmong/.test(readFileSync(P('js/firebase-config.js'), 'utf8')) ? 'WARN' : 'PASS', 'js/firebase-config.js', 'file cấu hình cục bộ; không đưa vào gói bán nếu chứa project của người bán');

console.log(`\nKết quả: ${fail} FAIL, ${warn} WARN`);
process.exit(fail ? 1 : 0);
