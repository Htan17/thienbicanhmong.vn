// Hồi quy màu sắc giao diện: đo tương phản WCAG của các luật màu CHỮ trong css/styles.css (không cần trình duyệt).
// Chỉ kiểm màu đặc (#rrggbb) do bộ sinh tools/gen-light-theme.py hoặc khối tay tạo ra; bỏ qua trạng thái disabled (WCAG miễn trừ).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Lấy luật CUỐI CÙNG (thắng theo thứ tự cascade, cùng độ ưu tiên) của từng bộ chọn có dạng prefix + .class{color:#hex}
const lastColor = (prefix) => {
  const re = new RegExp(prefix.replace(/[[\]"=.]/g, '\\$&') + '\\s*(\\.[A-Za-z0-9_\\\\:/\\-]+)\\s*\\{\\s*color:\\s*(#[0-9a-fA-F]{6})\\s*;?\\s*\\}', 'g');
  const m = new Map(); let x; while ((x = re.exec(css))) m.set(x[1], x[2]); return m;
};
const BG = { light: ['#ffffff', '#f4f4f5', '#e7e7ea'], dark: ['#000000', '#18181b', '#27272a'], studyLight: ['#f5f0e6', '#eee6d3', '#fdfbf6'] };
const failures = (map, bgs, skip = () => false) => [...map].filter(([c]) => !/disabled|placeholder|hover/.test(c) && !skip(c)).flatMap(([c, hex]) => bgs.filter((b) => ratio(hex, b) < 4.5).map((b) => `${c} ${hex} trên ${b} = ${ratio(hex, b).toFixed(2)}`));

test('nền sáng: mọi màu chữ đặc đạt >= 4.5:1 trên trắng, zinc-100 và nền thân trang', () => {
  const map = lastColor('html[data-theme="light"]');
  assert.ok(map.size > 40, 'phải có nhiều luật màu chữ');
  // chữ trên nền màu bão hòa (nút) được xử lý riêng bằng :is(...).text-white nên không nằm trong phép đo nền sáng
  assert.deepEqual(failures(map, BG.light), []);
});
test('nền tối: chữ phụ zinc-500/600 >= 4.5:1 trên đen, zinc-900 và zinc-800', () => {
  const map = lastColor('html[data-theme="dark"]');
  for (const k of ['.text-zinc-500', '.text-zinc-600']) assert.ok(map.has(k), 'thiếu ' + k);
  assert.deepEqual(failures(map, BG.dark), []);
});
test('Học tập + nền sáng (be): chữ phụ zinc-500/600 >= 4.5:1', () => {
  const map = lastColor('html[data-ui="study"][data-theme="light"]');
  for (const k of ['.text-zinc-500', '.text-zinc-600']) assert.ok(map.has(k), 'thiếu ' + k);
  const sub = new Map([...map].filter(([c]) => /text-zinc-(300|400|500|600)$/.test(c)));
  assert.deepEqual(failures(sub, BG.studyLight), []);
});
