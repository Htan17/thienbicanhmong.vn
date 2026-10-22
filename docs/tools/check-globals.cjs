// Kiểm tra mọi file trong src/ KHÔNG dùng biến chưa khai báo (trừ biến toàn cục nạp từ CDN). Cần: npm i -D typescript
const ts = require('typescript'); const path = require('path'); const fs = require('fs');
const ALLOWED = new Set(['React', 'ReactDOM', 'firebase', 'LZString', 'mammoth', 'askConfirm']);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.jsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
const files = walk(path.join(__dirname, '..', 'src'));
const prog = ts.createProgram(files, { allowJs: true, checkJs: true, noEmit: true, jsx: ts.JsxEmit.Preserve, lib: ['lib.dom.d.ts', 'lib.es2022.d.ts'], skipLibCheck: true });
let bad = 0;
for (const f of files) { const sf = prog.getSourceFile(f);
  for (const d of prog.getSemanticDiagnostics(sf)) if (d.code === 2304 || d.code === 2552) { const m = String(ts.flattenDiagnosticMessageText(d.messageText, '\n')).match(/'([^']+)'/); if (m && !ALLOWED.has(m[1])) { bad++; console.log(path.relative(process.cwd(), f) + ':' + (sf.getLineAndCharacterOfPosition(d.start).line + 1) + ' biến chưa khai báo: ' + m[1]); } } }
console.log(bad ? `THẤT BẠI: ${bad} lỗi` : 'OK: không có biến chưa khai báo'); process.exit(bad ? 1 : 0);
