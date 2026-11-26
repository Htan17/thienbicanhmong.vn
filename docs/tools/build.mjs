// Build tương thích Windows/Linux/macOS (không cần `sh`).
// src/main.jsx -> js/app.min.js (IIFE) và cập nhật ?v= của app.min.js trong index.html theo hash nội dung.
//   node tools/build.mjs           build + ghi js/app.min.js + cập nhật index.html
//   node tools/build.mjs --check   build trong bộ nhớ, so với js/app.min.js; exit 1 nếu bundle KHÔNG đồng bộ với src/
// React/Firebase/LZString/mammoth vẫn nạp bằng <script> CDN trong index.html nên KHÔNG đóng gói ở đây.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'js', 'app.min.js');
const htmlFile = path.join(root, 'index.html');
const checkOnly = process.argv.includes('--check');

let esbuild;
try { esbuild = await import('esbuild'); }
catch { console.error('Thiếu esbuild. Chạy `npm ci` ở thư mục gốc trước (cần mạng).'); process.exit(2); }

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src', 'main.jsx')],
  bundle: true, format: 'iife', target: 'es2019', minify: true, legalComments: 'none',
  loader: { '.jsx': 'jsx' }, write: false, outfile: outFile, logLevel: 'warning',
});
const code = result.outputFiles[0].contents; // Uint8Array
const hash = createHash('sha256').update(code).digest('hex').slice(0, 10);

if (checkOnly) {
  const cur = existsSync(outFile) ? createHash('sha256').update(readFileSync(outFile)).digest('hex').slice(0, 10) : null;
  console.log(`esbuild ${esbuild.version} | bundle từ src: ${hash} | js/app.min.js: ${cur}`);
  if (cur !== hash) { console.error('FAIL: js/app.min.js KHÔNG đồng bộ với src/ (hoặc khác phiên bản esbuild). Chạy `npm run build`.'); process.exit(1); }
  console.log('PASS: bundle đồng bộ với src/.'); process.exit(0);
}

writeFileSync(outFile, code);
let html = readFileSync(htmlFile, 'utf8');
const re = /js\/app\.min\.js\?v=[^"'\s>]*/;
if (!re.test(html)) { console.error('FAIL: index.html không có thẻ script js/app.min.js?v=...'); process.exit(1); }
html = html.replace(re, `js/app.min.js?v=${hash}`);
writeFileSync(htmlFile, html);
console.log(`Đã build js/app.min.js (${(code.length / 1024).toFixed(1)} KB) bằng esbuild ${esbuild.version}; cache version = ${hash}`);
