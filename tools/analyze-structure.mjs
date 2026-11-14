// Phân tích tĩnh cấu trúc source (Phase 9): file trùng, import không dùng, vòng import, file chưa được import, file lớn.
// Dùng: node tools/analyze-structure.mjs [--md]   (không cần cài thêm gói). Chỉ đọc, không sửa file.
import { readdirSync, readFileSync, statSync } from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);
const walk = (d, out = []) => { for (const n of readdirSync(d)) { if (SKIP.has(n)) continue; const p = path.join(d, n); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(m?js|jsx|cjs)$/.test(n)) out.push(p); } return out; };
const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'functions')), ...walk(path.join(root, 'tools')), ...walk(path.join(root, 'tests'))];
const rel = (p) => path.relative(root, p).replace(/\\/g, '/'); const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
// 1. trùng nội dung
const byHash = new Map(); for (const [f, t] of text) { if (t.trim().length < 80) continue; const h = crypto.createHash('sha1').update(t).digest('hex'); (byHash.get(h) || byHash.set(h, []).get(h)).push(rel(f)); }
const dups = [...byHash.values()].filter((v) => v.length > 1);
// 2. import không dùng (heuristic: tên chỉ xuất hiện đúng 1 lần trong file)
const unused = []; const IMP = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
for (const [f, t] of text) { if (!/\.(m?js|jsx)$/.test(f)) continue; let m; IMP.lastIndex = 0;
  while ((m = IMP.exec(t))) { const names = []; const clause = m[1]; const def = /^([A-Za-z_$][\w$]*)/.exec(clause.trim()); if (def && !clause.trim().startsWith('{') && !clause.trim().startsWith('*')) names.push(def[1]);
    const ns = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause); if (ns) names.push(ns[1]); const br = /\{([\s\S]*?)\}/.exec(clause); if (br) br[1].split(',').forEach((x) => { const a = x.trim().split(/\s+as\s+/); const n = (a[1] || a[0]).trim(); if (n) names.push(n); });
    for (const n of names) { const c = (t.match(new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || []).length; if (c <= 1) unused.push(`${rel(f)}: ${n} (từ ${m[2]})`); } } }
// 3. đồ thị import nội bộ + vòng + file mồ côi
const resolve = (from, spec) => { if (!spec.startsWith('.')) return null; const base = path.resolve(path.dirname(from), spec); for (const c of [base, base + '.js', base + '.jsx', base + '.mjs', base + '.cjs', path.join(base, 'index.js')]) if (text.has(c)) return c; return null; };
const graph = new Map(); const imported = new Set(); const SPEC = /(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const [f, t] of text) { const deps = new Set(); let m; SPEC.lastIndex = 0; while ((m = SPEC.exec(t))) { const r = resolve(f, m[1] || m[2] || m[3] || m[4]); if (r) { deps.add(r); imported.add(r); } } graph.set(f, [...deps]); }
const cycles = []; const state = new Map(); const stack = [];
const dfs = (n) => { state.set(n, 1); stack.push(n); for (const d of graph.get(n) || []) { if (state.get(d) === 1) cycles.push([...stack.slice(stack.indexOf(d)), d].map(rel).join(' -> ')); else if (!state.get(d)) dfs(d); } stack.pop(); state.set(n, 2); };
for (const n of graph.keys()) if (!state.get(n)) dfs(n);
const orphans = [...text.keys()].filter((f) => !imported.has(f) && /^src\//.test(rel(f)) && !/\.test\./.test(f)).map(rel);
// 4. file lớn
const big = [...text].map(([f, t]) => [rel(f), t.split('\n').length]).filter(([, n]) => n > 600).sort((a, b) => b[1] - a[1]);
const out = { files: files.length, lines: [...text.values()].reduce((s, t) => s + t.split('\n').length, 0), duplicates: dups, unusedImports: unused, cycles: [...new Set(cycles)], orphanSrcFiles: orphans, largeFiles: big };
if (process.argv.includes('--md')) { const L = (a) => (a.length ? a.map((x) => '- ' + (Array.isArray(x) ? x.join(' = ') : x)).join('\n') : '- (không có)');
  console.log(`# STRUCTURE_REPORT (sinh bởi tools/analyze-structure.mjs)\n\nFile quét: ${out.files}, tổng ${out.lines} dòng.\n\n## File trùng nội dung\n${L(out.duplicates)}\n\n## Import có vẻ không dùng (heuristic)\n${L(out.unusedImports)}\n\n## Vòng import\n${L(out.cycles)}\n\n## File trong src/ không được ai import (có thể là entry hoặc code chết — cần kiểm tay)\n${L(out.orphanSrcFiles)}\n\n## File > 600 dòng\n${L(big.map(([f, n]) => `${f}: ${n} dòng`))}\n`); }
else console.log(JSON.stringify(out, null, 1));
