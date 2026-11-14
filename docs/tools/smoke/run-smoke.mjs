// Smoke test giao diện bằng Chromium + Firebase GIẢ (không phải E2E, không kiểm Rules/Functions).
// Mục đích: so sánh DOM của ứng dụng TRƯỚC và SAU refactor khi nhấp qua các nút. Dùng:
//   node tools/smoke/run-smoke.mjs <thư-mục-dự-án> <out.json> [--depth2=N]
// Cần: playwright (có Chromium), react + react-dom, esbuild. Đặt SMOKE_MODULES=/đường/dẫn/node_modules nếu không nằm trong dự án.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(process.argv[2] || '.');
const outFile = path.resolve(process.argv[3] || 'smoke-result.json');
const depth2Cap = Number((process.argv.find((a) => a.startsWith('--depth2=')) || '--depth2=10').split('=')[1]);
const bundleOverride = (process.argv.find((a) => a.startsWith('--bundle=')) || '').split('=')[1];
const covOut = (process.argv.find((a) => a.startsWith('--coverage=')) || '').split('=')[1];
const modRoot = process.env.SMOKE_MODULES || path.join(projectDir, 'node_modules');
const req = createRequire(path.join(modRoot, 'x.js'));
const { chromium } = req('playwright');
const esbuild = req('esbuild');

// React/ReactDOM dạng biến toàn cục (index.html nạp từ CDN; ở đây dựng từ node_modules, giống nhau cho cả hai bên so sánh)
const shim = await esbuild.build({ stdin: { contents: "window.React=require('react');window.ReactDOM=Object.assign({},require('react-dom'),require('react-dom/client'));", resolveDir: modRoot, loader: 'js' }, bundle: true, format: 'iife', write: false, define: { 'process.env.NODE_ENV': '"production"' }, nodePaths: [modRoot] });
const reactShim = shim.outputFiles[0].text;
const fakeFirebase = fs.readFileSync(path.join(here, 'fake-firebase.js'), 'utf8');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((rq, rs) => {
  const rel = decodeURIComponent(rq.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  const p = bundleOverride && rel === 'js/app.min.js' ? path.resolve(bundleOverride) : path.join(projectDir, rel);
  const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if ((!f.startsWith(projectDir) && f !== path.resolve(bundleOverride || '/nonexistent')) || !fs.existsSync(f)) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); rs.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const init = `(()=>{let s=123456789;Math.random=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const R=Date,B=Date.UTC(2026,10,14,3,0,0);window.Date=class extends R{constructor(...a){a.length?super(...a):super(B)}static now(){return B}};
window.alert=()=>{};window.confirm=()=>true;window.prompt=()=>'x';window.open=()=>null;})();`;

const browser = await chromium.launch();
const covMap = new Map(); // functionName -> max callCount
async function closePage(page) {
  if (covOut && page.__cov) { try { const cov = await page.coverage.stopJSCoverage(); for (const e of cov) { if (!/app\.min\.js/.test(e.url)) continue; for (const f of e.functions) { if (!f.functionName) continue; const c = f.ranges[0].count; covMap.set(f.functionName, Math.max(covMap.get(f.functionName) || 0, c)); } } } catch (e) { /* trang đã đóng */ } }
  await page.context().close();
}
async function newPage(query) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  page.__errs = [];
  page.on('pageerror', (e) => page.__errs.push('pageerror: ' + String(e.message).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') page.__errs.push('console.error: ' + m.text().slice(0, 160)); });
  if (covOut) { await page.coverage.startJSCoverage({ resetOnNavigation: false }); page.__cov = true; }
  await page.addInitScript(init);
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    const body = /firebasejs.*app-compat/.test(u) ? fakeFirebase : /react\.production/.test(u) ? reactShim
      : /lz-string/.test(u) ? 'window.LZString={compressToEncodedURIComponent:s=>s,decompressFromEncodedURIComponent:s=>s,compress:s=>s,decompress:s=>s};'
      : /mammoth/.test(u) ? 'window.mammoth={};' : '';
    route.fulfill({ status: 200, contentType: u.endsWith('.css') || /fonts\.googleapis/.test(u) ? 'text/css' : 'text/javascript', body });
  });
  await page.goto(base + 'index.html' + (query || ''), { waitUntil: 'domcontentloaded' });
  return page;
}
const settle = async (page, ms = 450) => { await page.waitForTimeout(ms); };
const snap = async (page) => {
  const html = await page.evaluate(() => (document.getElementById('root') || document.body).innerHTML);
  return { hash: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16), len: html.length, html };
};
const clickables = (page) => page.evaluate(() => {
  const out = []; const all = document.querySelectorAll('#root *');
  all.forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const clickable = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || cs.cursor === 'pointer';
    if (!clickable) return;
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer' && el.tagName !== 'BUTTON') return; // chỉ lấy phần tử ngoài cùng
    out.push((el.innerText || el.getAttribute('aria-label') || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 40));
  });
  return out;
});
async function clickNth(page, n) {
  const ok = await page.evaluate((n) => {
    const list = []; document.querySelectorAll('#root *').forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const c = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || cs.cursor === 'pointer'; if (!c) return;
      if (el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer' && el.tagName !== 'BUTTON') return; list.push(el);
    });
    if (!list[n]) return false; list[n].click(); return true;
  }, n);
  return ok;
}
async function replay(query, path) {
  const page = await newPage(query); await settle(page, 1600);
  for (const n of path) { await clickNth(page, n); await settle(page, 350); }
  return page;
}

const result = { scenes: {}, errors: {} };
const record = async (key, page) => { const s = await snap(page); result.scenes[key] = { hash: s.hash, len: s.len }; result.errors[key] = [...new Set(page.__errs)]; return s; };

// Cảnh 0: chưa đăng nhập
{ const p = await newPage('?auth=out'); await settle(p, 1800); await record('login', p); const names = await clickables(p); result.loginButtons = names; await closePage(p); }
// Cảnh 1: Dashboard
const dash = await newPage(''); await settle(dash, 1800);
await record('dashboard', dash); const l1 = await clickables(dash); result.dashButtons = l1;
await closePage(dash);
// Độ sâu 1
const depth1Changed = [];
for (let i = 0; i < l1.length; i++) {
  const p = await replay('', [i]); const s = await record(`d1:${i}:${l1[i]}`, p);
  if (s.hash !== result.scenes.dashboard.hash) depth1Changed.push(i);
  await closePage(p);
}
// Độ sâu 2 (giới hạn mỗi màn hình)
for (const i of depth1Changed) {
  const p = await replay('', [i]); const l2 = await clickables(p); await closePage(p);
  for (let j = 0; j < Math.min(l2.length, depth2Cap); j++) {
    const q = await replay('', [i, j]); await record(`d2:${i}.${j}:${l1[i]}>${l2[j]}`, q); await closePage(q);
  }
}
await browser.close(); server.close();
fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
if (covOut) fs.writeFileSync(covOut, JSON.stringify(Object.fromEntries(covMap), null, 1));
const keys = Object.keys(result.scenes);
console.log(`scenes: ${keys.length}; dashboard buttons: ${l1.length}; changed screens: ${depth1Changed.length}; scenes with errors: ${keys.filter((k) => result.errors[k].length).length}`);
