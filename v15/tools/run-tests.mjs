// Chạy test không phụ thuộc shell glob (PowerShell/cmd không tự mở rộng *).
//   node tools/run-tests.mjs <nhóm...>   nhóm: root | frontend | functions | rules | all
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir, re) => { const out = [];
  for (const n of readdirSync(dir)) { if (n === 'node_modules') continue; const p = path.join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p, re)); else if (re.test(n)) out.push(p); } return out; };
const groups = {
  root: () => readdirSync(path.join(root, 'tests')).filter((n) => /\.test\.mjs$/.test(n)).map((n) => path.join(root, 'tests', n)),
  frontend: () => walk(path.join(root, 'src'), /\.test\.m?js$/),
  functions: () => walk(path.join(root, 'functions', 'test'), /\.test\.m?js$/),
  rules: () => walk(path.join(root, 'tests', 'rules'), /\.test\.m?js$/),
};
let want = process.argv.slice(2); if (!want.length || want.includes('all')) want = ['root', 'frontend', 'functions'];
let failed = 0;
for (const g of want) {
  if (!groups[g]) { console.error('Nhóm không hợp lệ:', g); process.exit(2); }
  const files = groups[g](); if (!files.length) { console.error(`Nhóm ${g}: không tìm thấy file test`); failed++; continue; }
  console.log(`\n=== test:${g} (${files.length} file) ===`);
  const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
