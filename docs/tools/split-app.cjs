/*
 * split-app.cjs - Công cụ tách app.jsx (1 file nguyên khối) thành các module ES.
 * Cách làm: dùng TypeScript compiler API để đọc cây cú pháp, gán từng khai báo cấp cao nhất vào module
 * theo bảng MAP (theo số dòng của file gốc), tự động tính import/export dựa trên danh sách tên được dùng.
 * Mã được sao chép NGUYÊN VĂN (không viết lại) -> hành vi không đổi; chỉ thêm "export" và "import".
 * Dùng: node split-app.cjs <app.jsx gốc> <thư mục src đầu ra>
 */
const ts = require('/home/claude/.npm-global/lib/node_modules/typescript');
const fs = require('fs'), path = require('path');
const [,, inFile, outDir] = process.argv;
const src = fs.readFileSync(inFile, 'utf8');
const sf = ts.createSourceFile(inFile, src, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JSX);

// [dòng bắt đầu, dòng kết thúc, module đích]  (null = bỏ, đã thay bằng module mới)
const MAP = [
  [1,2,'lib/storage.js'], [4,5,'config/constants.js'], [7,9,'config/firebase.js'],
  [25,122,'lib/audio.js'], [125,231,'config/gameData.js'], [233,254,'lib/userData.js'],
  [256,275,'config/gameData.js'], [276,281,'components/common.jsx'], [284,285,null],
  [286,288,'config/gameData.js'], [289,290,'lib/userData.js'], [292,316,'lib/format.js'],
  [323,476,'lib/gemini.js'], [478,574,'lib/helpers.js'], [577,632,'lib/progress.js'],
  [635,735,'components/common.jsx'], [743,757,'lib/cjk.js'],
  [768,880,'components/CharacterWritePractice.jsx'], [888,941,'components/ClickableSentence.jsx'],
  [946,1032,'components/ZoomableImage.jsx'], [1037,1172,'lib/srs.js'],
  [1174,1298,'components/SuPhuHub.jsx'], [1300,5903,'App.jsx'], [5905,5906,'main.jsx'],
];
// Tên do module mới cung cấp (không nằm trong app.jsx gốc)
const EXTRA_PROVIDED = { isContentBlocked: 'lib/contentFilter.js' };
const GLOBAL_OK = new Set(); // các biến toàn cục (React, firebase...) KHÔNG import

const modOf = (line) => { for (const [a,b,m] of MAP) if (line>=a && line<=b) return m; throw new Error('Dòng '+line+' chưa được gán module'); };

// 1) thu thập statement + tên khai báo
const stmts = []; let prevEnd = 0;
for (const st of sf.statements) {
  const startLine = sf.getLineAndCharacterOfPosition(st.getStart()).line + 1;
  const names = [];
  if (ts.isVariableStatement(st)) { for (const d of st.declarationList.declarations) { if (!ts.isIdentifier(d.name)) throw new Error('destructuring cấp cao nhất dòng '+startLine); names.push(d.name.text); } if (!(st.declarationList.flags & ts.NodeFlags.Const)) console.error('CẢNH BÁO: khai báo không phải const ở dòng', startLine, names); }
  else if (ts.isFunctionDeclaration(st)) names.push(st.name.text);
  stmts.push({ st, startLine, names, mod: modOf(startLine), lead: src.slice(prevEnd, st.getStart()), body: src.slice(st.getStart(), st.end) });
  prevEnd = st.end;
}
const declaredIn = {}; // tên -> module
for (const s of stmts) if (s.mod) for (const n of s.names) { if (declaredIn[n]) throw new Error('trùng tên '+n); declaredIn[n] = s.mod; }
Object.assign(declaredIn, EXTRA_PROVIDED);

// 2) tìm tham chiếu tới tên cấp cao nhất trong mỗi statement
function refs(node) {
  const out = new Set();
  (function walk(n, parent) {
    if (ts.isIdentifier(n)) {
      const p = parent;
      const isPropName = (p && ts.isPropertyAccessExpression(p) && p.name === n) || (p && ts.isPropertyAssignment(p) && p.name === n) ||
        (p && ts.isJsxAttribute(p) && p.name === n) || (p && ts.isPropertyDeclaration(p) && p.name === n) || (p && ts.isMethodDeclaration(p) && p.name === n) ||
        (p && ts.isBindingElement(p) && p.propertyName === n) || (p && ts.isQualifiedName(p) && p.right === n);
      if (!isPropName && declaredIn[n.text]) out.add(n.text);
    }
    ts.forEachChild(n, c => walk(c, n));
  })(node, null);
  return out;
}
const needs = {}; // module -> { fromModule -> Set(names) }
const exportsNeeded = {}; // module -> Set(names)
for (const s of stmts) {
  if (!s.mod) continue;
  const own = new Set(s.names);
  for (const r of refs(s.st)) {
    const from = declaredIn[r];
    if (from === s.mod) continue;
    ((needs[s.mod] = needs[s.mod] || {})[from] = (needs[s.mod][from] || new Set())).add(r);
    (exportsNeeded[from] = exportsNeeded[from] || new Set()).add(r);
  }
}
// 3) phát hiện vòng phụ thuộc
const graph = {}; for (const m in needs) graph[m] = Object.keys(needs[m]);
const state = {}; const cyc = [];
(function dfs(u, stack) { state[u] = 1; for (const v of (graph[u] || [])) { if (state[v] === 1) cyc.push([...stack, u, v].join(' -> ')); else if (!state[v]) dfs(v, [...stack, u]); } state[u] = 2; })
  ; for (const m in graph) if (!state[m]) (function dfs(u, stack) { state[u] = 1; for (const v of (graph[u] || [])) { if (state[v] === 1) cyc.push([...stack, u, v].join(' -> ')); else if (!state[v]) dfs(v, [...stack, u]); } state[u] = 2; })(m, []);
if (cyc.length) { console.error('VÒNG PHỤ THUỘC:\n' + cyc.join('\n')); }

// 4) ghi file
const rel = (from, to) => { let r = path.relative(path.dirname(path.join('/', from)), path.join('/', to)).replace(/\\/g, '/'); return r.startsWith('.') ? r : './' + r; };
const byMod = {}; for (const s of stmts) if (s.mod) (byMod[s.mod] = byMod[s.mod] || []).push(s);
const report = [];
for (const [m, list] of Object.entries(byMod)) {
  let head = '';
  const imp = needs[m] || {};
  for (const from of Object.keys(imp).sort()) head += `import { ${[...imp[from]].sort().join(', ')} } from '${rel(m, from)}';\n`;
  let body = '';
  for (const s of list) {
    let text = s.body;
    const ex = s.names.filter(n => (exportsNeeded[m] || new Set()).has(n));
    if (m === 'App.jsx' && s.names.includes('ThienKieuApp')) text = 'export ' + text;
    else if (ex.length && (ts.isVariableStatement(s.st) || ts.isFunctionDeclaration(s.st))) text = 'export ' + text;
    body += s.lead + text;
  }
  // chuẩn hoá thụt lề: bỏ 8 dấu cách đầu mỗi dòng (file gốc nằm trong <script> nên bị thụt 8)
  body = body.split('\n').map(l => l.startsWith('        ') ? l.slice(8) : l).join('\n');
  const file = path.join(outDir, m);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, (head ? head + '\n' : '') + body.replace(/^\s*\n/, '') + '\n');
  report.push(`${m}\t${list.length} khai báo\t${body.split('\n').length} dòng`);
}
fs.writeFileSync(path.join(outDir, '..', 'tools-split-report.txt'), report.join('\n') + '\n' + (cyc.length ? 'VÒNG: ' + cyc.join('; ') : 'Không có vòng phụ thuộc'));
console.log(report.join('\n')); console.log(cyc.length ? 'CÓ VÒNG PHỤ THUỘC' : 'Không có vòng phụ thuộc');
