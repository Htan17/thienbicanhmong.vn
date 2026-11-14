// Đối chiếu catalog server với src/config/gameData.js (nguồn client). Lệch giá/định danh => test fail.
import test from 'node:test'; import assert from 'node:assert'; import { createRequire } from 'node:module';
import * as G from '../../src/config/gameData.js';
const C = createRequire(import.meta.url)('../lib/catalog.js');
const same = (arr, kind, prefix = '') => arr.forEach((x) => {
  const s = C.SHOP[x.id]; assert.ok(s, `thiếu ${kind} ${x.id} ở server`);
  assert.strictEqual(s.price, x.price, `giá ${x.id} lệch`); assert.strictEqual(s.inventoryId, prefix + x.id);
});
test('FRAMES/NAME_FRAMES/NAME_COLORS/AURAS/THEMES khớp', () => { same(G.FRAMES, 'frame'); same(G.NAME_FRAMES, 'nf'); same(G.NAME_COLORS, 'nc'); same(G.PERSONAL_AURAS, 'aura'); same(G.APP_THEMES, 'theme'); });
test('SFX_PACKS có giá > 0 khớp', () => same(G.SFX_PACKS.filter((p) => p.price > 0), 'sfx', 'sfx_'));
test('ITEMS (bùa) khớp', () => G.ITEMS.forEach((x) => { assert.ok(C.SHOP[x.id], 'thiếu ' + x.id); assert.strictEqual(C.SHOP[x.id].price, x.price); }));
test('RANKS khớp', () => G.RANKS.forEach((r, i) => { const s = C.RANKS[i]; assert.deepStrictEqual([s.id, s.price, s.reqFame, s.level, s.bonusPercent], [r.id, r.price, r.reqFame, r.level, r.bonusPercent]); }));
test('BUFF_DEFS khớp (giờ hiệu lực, loại, hệ số)', () => Object.entries(G.BUFF_DEFS).forEach(([id, d]) => { const s = C.BUFF_DEFS[id]; assert.ok(s, id); assert.strictEqual(s.hours, d.hours); assert.strictEqual(s.kind, d.kind); assert.strictEqual(s.mult, d.mult); }));
test('hằng số buff/mùa khớp', () => { assert.strictEqual(C.BUFF_DAILY_LIMIT, G.BUFF_DAILY_LIMIT); assert.strictEqual(C.BUFF_MAX_STACK_MS, G.BUFF_MAX_STACK_MS); assert.strictEqual(C.LB_MIN_LESSONS, G.LB_MIN_LESSONS); [0, 1, 2, 5, 20].forEach((i) => assert.deepStrictEqual(C.seasonRewardFor(i), G.seasonRewardFor(i))); });
test('danh hiệu Đạo Lộ: id khớp', () => assert.deepStrictEqual(C.EXAM_PATH_TITLE_IDS, G.EXAM_PATH_TITLES.slice(0, 3).map((t) => t.id)));
test('server không bán thứ client không có', () => {
  const ids = new Set([...G.FRAMES, ...G.NAME_FRAMES, ...G.NAME_COLORS, ...G.PERSONAL_AURAS, ...G.APP_THEMES, ...G.ITEMS, ...G.SFX_PACKS].map((x) => x.id)); ids.add('x2_card');
  Object.keys(C.SHOP).forEach((id) => assert.ok(ids.has(id), 'catalog server thừa: ' + id));
});
test('guild-catalog.json khớp gameData (thần thú, màu tên, khung)', () => {
  const P = C.GUILD_PERKS;
  G.GUILD_BEASTS.forEach((b) => assert.strictEqual(P.beast[b.icon], b.price));
  G.NAME_COLORS.forEach((c) => assert.strictEqual(P.color[c.color], 1000));
  G.FRAMES.forEach((f) => assert.strictEqual(P.frame[f.id], 2000));
  assert.strictEqual(Object.keys(P.beast).length, G.GUILD_BEASTS.length);
});

test('giá trị trang bị (mã màu tên, class hào quang) khớp gameData', () => {
  G.NAME_COLORS.forEach((c) => assert.strictEqual(C.NAME_COLOR_VALUE[c.id], c.color, c.id));
  G.PERSONAL_AURAS.forEach((a) => assert.strictEqual(C.AURA_CLASS[a.id], a.class, a.id));
});
