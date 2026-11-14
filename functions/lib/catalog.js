// Catalog giá & dữ liệu game PHÍA SERVER. Nguồn: src/config/gameData.js (V11). Phải đồng bộ khi gameData.js đổi.
// Server là nguồn xác định giá duy nhất: client không gửi giá.
const RANKS = [
  { id: 'refining', price: 0, reqFame: 0, level: 1, bonusPercent: 0 },
  { id: 'foundation', price: 500, reqFame: 0, level: 2, bonusPercent: 5 },
  { id: 'goldencore', price: 2000, reqFame: 0, level: 3, bonusPercent: 10 },
  { id: 'nascent', price: 5000, reqFame: 0, level: 4, bonusPercent: 15 },
  { id: 'divine', price: 10000, reqFame: 1000, level: 5, bonusPercent: 20 },
  { id: 'greatsage', price: 25000, reqFame: 3000, level: 6, bonusPercent: 25 },
  { id: 'immortal', price: 50000, reqFame: 10000, level: 7, bonusPercent: 30 },
  { id: 'tiende', price: 100000, reqFame: 25000, level: 8, bonusPercent: 35 },
  { id: 'daoto', price: 250000, reqFame: 50000, level: 9, bonusPercent: 40 },
  { id: 'sangthe', price: 500000, reqFame: 100000, level: 10, bonusPercent: 45 },
];
const BUFF_DEFS = {
  linh_tu_phu: { price: 1500, hours: 24, kind: 'spirit', mult: 1.5 },
  danh_vong_phu: { price: 1200, hours: 24, kind: 'fame', mult: 2 },
  thien_dao_lenh: { price: 2000, hours: 24, kind: 'season', mult: 1.3 },
  tay_tuy_dan: { price: 1000, hours: 48, kind: 'shield', mult: 1 },
};
const BUFF_DAILY_LIMIT = 3, BUFF_MAX_STACK_MS = 48 * 3600e3, X2_DURATION_MS = 2 * 3600e3, X2_DAILY_LIMIT = 2;
const EXAM_PATH_TITLE_IDS = ['ept_1', 'ept_2', 'ept_3'];
const LB_MIN_LESSONS = 3;
const SEASON_DURATION = 48 * 3600e3, GUILD_SEASON_DURATION = 3 * 24 * 3600e3;
const GUILD_TIERS = [5000, 3000, 1000];
const seasonRewardFor = (i) => i === 0 ? { s: 3000, f: 80 } : i === 1 ? { s: 2000, f: 50 } : i === 2 ? { s: 1200, f: 30 } : i < 10 ? { s: 400, f: 10 } : { s: 150, f: 0 };

// Danh mục mua bằng Linh Thạch. stackable = có thể mua nhiều lần (túi đồ chứa bản trùng).
const SHOP = {};
const add = (arr, kind, prefix = '') => arr.forEach(([id, price]) => { SHOP[id] = { kind, price, inventoryId: prefix + id, stackable: false }; });
add([['luctruc', 50], ['huyetma', 100], ['cuuu', 200], ['chanlong', 500], ['viemde', 1000], ['banghan', 2000], ['mathan', 5000]], 'frame');
add([['nf_vip', 150], ['nf_maton', 300], ['nf_kiemthan', 500], ['nf_daoton', 800], ['nf_viemde', 1000], ['nf_tiende', 2000], ['nf_thanthoai', 5000], ['nf_tongsu', 99999]], 'nameFrame');
add([['nc_cyan', 1000], ['nc_pink', 1500], ['nc_green', 2000], ['nc_purple', 2500], ['nc_gold', 3000], ['nc_blood', 4000], ['nc_darkgold', 5000]], 'nameColor');
add([['pa_sacred', 5000], ['pa_blood', 5000], ['pa_gold', 8000], ['pa_rainbow', 10000], ['pa_starlight', 15000], ['pa_chaos', 99999]], 'aura');
add([['theme-blood', 3000], ['theme-abyss', 3000], ['theme-gold', 8000]], 'appTheme');
add([['chime', 800], ['retro', 600], ['crystal', 1000], ['thunder', 1500]], 'sfx', 'sfx_');
add([['aura_laoma', 5000]], 'aura');
Object.entries(BUFF_DEFS).forEach(([id, d]) => { SHOP[id] = { kind: 'buff', price: d.price, inventoryId: id, stackable: true, dailyLimit: BUFF_DAILY_LIMIT }; });
SHOP.x2_card = { kind: 'x2', price: 3000, inventoryId: 'x2_card', stackable: true, dailyLimit: X2_DAILY_LIMIT };

// Trang bị: ô -> trường hồ sơ; giá trị ghi vào hồ sơ theo từng vật phẩm (màu tên lưu mã màu, hào quang lưu tên class; còn lại lưu id).
const EQUIP_FIELD = { frame: 'frame', nameFrame: 'nameFrame', nameColor: 'nameColor', aura: 'aura', appTheme: 'appTheme', sfx: 'sfxPack' };
const NAME_COLOR_VALUE = { nc_cyan: '#00ffff', nc_pink: '#ff00ff', nc_green: '#22c55e', nc_purple: '#a855f7', nc_gold: '#ffdf00', nc_blood: '#dc2626', nc_darkgold: '#b8860b' };
const AURA_CLASS = { pa_sacred: 'aura-sacred', pa_blood: 'aura-blood', pa_gold: 'aura-gold', pa_rainbow: 'aura-rainbow', pa_starlight: 'aura-starlight', pa_chaos: 'aura-chaos' };
const GUILD_PERKS = require('./guild-catalog.json');
// Đổi Công Trạng lấy quà (bang chủ): id do client gửi, giá/loại/giá trị do SERVER giữ.
const GUILD_OFFERS = { spirit5000: { cost: 2000, type: 'spirit', value: 5000 }, x2pair: { cost: 1000, type: 'x2' }, nf_tongsu: { cost: 5000, type: 'item', value: 'nf_tongsu' }, pa_chaos: { cost: 10000, type: 'item', value: 'pa_chaos' } };
const GUILD_MAX_LEVEL = 5, GUILD_UPGRADE_MEMBERS = 3;
module.exports = { GUILD_PERKS, GUILD_OFFERS, GUILD_MAX_LEVEL, GUILD_UPGRADE_MEMBERS, RANKS, BUFF_DEFS, BUFF_DAILY_LIMIT, X2_DAILY_LIMIT, BUFF_MAX_STACK_MS, X2_DURATION_MS, EXAM_PATH_TITLE_IDS, LB_MIN_LESSONS,
  SEASON_DURATION, GUILD_SEASON_DURATION, GUILD_TIERS, seasonRewardFor, SHOP, EQUIP_FIELD, NAME_COLOR_VALUE, AURA_CLASS };
