// Logic thuần (không phụ thuộc Firebase) => unit test được bằng `node --test`.
const C = require('./catalog');
const rankBonusPercent = (rank) => (C.RANKS.find((r) => r.id === rank) || {}).bonusPercent || 0;
const buffActive = (u, id, now) => !!(u && u.buffs && u.buffs[id] > now);
const buffMult = (u, kind, now) => Object.keys(C.BUFF_DEFS).reduce((m, id) => (C.BUFF_DEFS[id].kind === kind && buffActive(u, id, now) ? m * C.BUFF_DEFS[id].mult : m), 1);
const x2Active = (u, now) => !!(u && u.x2BoostExpiresAt && now < u.x2BoostExpiresAt);
// Công thức y hệt App.jsx (continueAfterAnswer). Đầu vào đã được validate (0<=correct<=total, total>=1).
function quizReward(u, correct, total, now) {
  let stones = 0, fame = 0;
  if (correct > 0) {
    stones = correct * 50; fame = correct === total ? 50 : 0;
    const rb = rankBonusPercent(u.rank); if (rb > 0) stones = Math.round(stones * (1 + rb / 100));
    if (x2Active(u, now)) stones *= 2;
    stones = Math.round(stones * buffMult(u, 'spirit', now)); fame = Math.round(fame * buffMult(u, 'fame', now));
  }
  const season = Math.round((correct + (correct === total && total >= 5 ? 5 : 0)) * buffMult(u, 'season', now));
  return { stones, fame, season, lesson: correct > 0 ? 1 : 0 };
}
const vnDay = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
// Áp trần theo ngày; trả về phần thực nhận.
function applyDailyCap(state, now, want, caps) {
  const day = vnDay(now); const d = state && state.day === day ? state : { day, spirit: 0, fame: 0 };
  const s = Math.max(0, Math.min(want.stones, caps.spirit - d.spirit)), f = Math.max(0, Math.min(want.fame, caps.fame - d.fame));
  return { s, f, next: { day, spirit: d.spirit + s, fame: d.fame + f } };
}
function rankUpgrade(u, rankId) {
  const target = C.RANKS.find((r) => r.id === rankId), cur = C.RANKS.find((r) => r.id === u.rank) || C.RANKS[0];
  if (!target || target.level !== cur.level + 1) return { error: 'Chỉ được đột phá lên cảnh giới kế tiếp' };
  if ((u.spirit || 0) < target.price) return { error: 'Không đủ Linh Thạch' };
  if ((u.fame || 0) < target.reqFame) return { error: 'Không đủ Danh Vọng' };
  return { spirit: -target.price, fame: -target.reqFame + 100 }; // y hệt App.jsx:2994
}
const vnDate = (ms) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(ms)); // y hệt getVNSourceDate (client)
function purchasePlan(u, itemId, now) {
  const it = C.SHOP[itemId]; if (!it) return { error: 'Vật phẩm không tồn tại' };
  const inv = u.inventory || [];
  if (!it.stackable && inv.includes(it.inventoryId)) return { error: 'Đã sở hữu' };
  if ((u.spirit || 0) < it.price) return { error: 'Không đủ Linh Thạch' };
  const date = vnDate(now);
  const dp = u.dailyPurchases && u.dailyPurchases.date === date ? u.dailyPurchases : { date, count: 0, x2: 0 };
  const rec = { ...dp, b: { ...(dp.b || {}) } };
  if (C.BUFF_DEFS[itemId]) { const n = rec.b[itemId] || 0; if (n >= C.BUFF_DAILY_LIMIT) return { error: 'Hết lượt mua hôm nay' }; rec.b[itemId] = n + 1; }
  if (itemId === 'x2_card') { if ((rec.x2 || 0) >= C.X2_DAILY_LIMIT) return { error: 'Hết lượt mua hôm nay' }; rec.x2 = (rec.x2 || 0) + 1; }
  return { price: it.price, inventory: [...inv, it.inventoryId], dailyPurchases: rec };
}

// Chuỗi điểm danh — y hệt calculateStreak (src/lib/progress.js) nhưng nhận `now` để test được.
function streakUpdate(u, now) {
  const today = vnDate(now);
  if (u.streakRestorePending) return { streakCount: (u.streakCount || 0) + 1, lastPlayedDate: today, clearPending: true };
  if (u.lastPlayedDate === today) return { streakCount: u.streakCount || 0, lastPlayedDate: today };
  const yesterday = vnDate(now - 86400e3);
  return { streakCount: u.lastPlayedDate === yesterday ? (u.streakCount || 0) + 1 : 1, lastPlayedDate: today };
}
// Khung giờ tính Đạo Hữu Bảng: 4h00–23h00 giờ VN (isExamPathWindowOpen ở client)
const examWindowOpen = (now) => { const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date(now))) % 24; return h >= 4 && h < 23; };
// Điểm Đạo Hữu Bảng của một lượt: số phút (0.2 .. total*2) làm tròn 0.1, x10 như client — thời gian đo bằng ĐỒNG HỒ SERVER từ lúc startQuiz.
const examDailyScore = (startedAt, now, total) => Math.round(Math.max(0.2, Math.min((now - startedAt) / 60000, total * 2)) * 10) / 10;
// ---- Tông Môn ----
// Giá/nguồn trả của một perk. '' = gỡ perk (miễn phí). Trả về {spirit?, exp?} hoặc {error}.
function guildPerkCost(perkType, value) {
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if (!own(C.GUILD_PERKS, perkType)) return { error: 'Loại trang hoàng không tồn tại' };
  const tbl = C.GUILD_PERKS[perkType]; if (!tbl) return { error: 'Loại trang hoàng không tồn tại' };
  if (value === '') return {};
  if (!own(tbl, value)) return { error: 'Vật phẩm trang hoàng không hợp lệ' };
  const e = tbl[value]; if (e === undefined) return { error: 'Vật phẩm trang hoàng không hợp lệ' };
  return typeof e === 'number' ? { spirit: e } : e;
}
function guildUpgradePlan(guild, memberRanks) {
  if ((guild.level || 1) >= C.GUILD_MAX_LEVEL) return { error: 'Tông môn đã đạt đỉnh cấp' };
  const need = (guild.level || 1) + 1;
  const ok = memberRanks.filter((r) => { const x = C.RANKS.find((k) => k.id === r); return x && x.level >= need; }).length;
  if (ok < C.GUILD_UPGRADE_MEMBERS) return { error: `Chưa đủ môn đồ (${ok}/${C.GUILD_UPGRADE_MEMBERS}) đạt cảnh giới cấp ${need}` };
  return { level: need };
}
// Gia nhập Tông môn: điều kiện do server quyết định (sức chứa = cấp * 5).
function guildJoinPlan(guild, uid, userGuild) {
  if (userGuild) return { error: 'Đã ở trong một Tông môn, hãy rời trước' };
  if (!guild) return { error: 'Tông môn không tồn tại' };
  const members = Array.isArray(guild.members) ? guild.members : [];
  if (members.includes(uid)) return { error: 'Đã ở trong Tông môn này' };
  if (members.length >= (guild.level || 1) * 5) return { error: 'Tông môn đã đầy người' };
  return { members: members.concat(uid) };
}
// Gacha "Tạo Hoá Khí Vận": phí 200 LT; roll in [0,1) do server sinh. Giữ nguyên tỉ lệ cũ của client.
const GACHA_COST = 200;
function gachaOutcome(roll, hasX2) {
  if (roll < 0.4) return { text: 'Nổ Lô! Lỗ chỏng vó! Trả lại 50 LT.', spirit: 50, fame: 0, x2: false };
  if (roll < 0.7) return { text: 'Tiểu Duyên! Nhận 300 LT.', spirit: 300, fame: 0, x2: false };
  if (roll < 0.9) return { text: 'Thiên Đạo Chúc Phúc! +80 Sao.', spirit: 0, fame: 80, x2: false };
  if (!hasX2) return { text: 'KỲ NGỘ! Nhận Bùa x2 vĩnh viễn!', spirit: 0, fame: 0, x2: true };
  return { text: 'Linh Mạch Bạo Phát! Nhận 1500 LT!', spirit: 1500, fame: 0, x2: false };
}
// Quyền Bang Chủ: dữ liệu cũ có thể lưu leader theo TÊN, nên chấp nhận cả uid lẫn tên (tên lấy từ hồ sơ trên server, không từ client).
const isGuildLeader = (g, uid, name) => !!g && (g.leader === uid || (!!name && g.leader === name));
function guildKickPlan(g, uid, name, targetUid) {
  if (!g) return { error: 'Tông môn không tồn tại' };
  if (!isGuildLeader(g, uid, name)) return { error: 'Chỉ Bang Chủ mới có quyền này', code: 'permission-denied' };
  const members = Array.isArray(g.members) ? g.members : [];
  if (targetUid === uid || targetUid === g.leader) return { error: 'Không thể trục xuất Bang Chủ' };
  if (!members.includes(targetUid)) return { error: 'Người này không ở trong Tông môn (dữ liệu cũ theo tên cần di trú)' };
  return { members: members.filter((m) => m !== targetUid) };
}
function guildTransferPlan(g, uid, name, targetUid) {
  if (!g) return { error: 'Tông môn không tồn tại' };
  if (!isGuildLeader(g, uid, name)) return { error: 'Chỉ Bang Chủ mới có quyền này', code: 'permission-denied' };
  const members = Array.isArray(g.members) ? g.members : [];
  if (targetUid === uid || targetUid === g.leader) return { error: 'Người này đã là Bang Chủ' };
  if (!members.includes(targetUid)) return { error: 'Chỉ chuyển quyền cho thành viên trong Tông môn' };
  return { leader: targetUid };
}
function guildDissolvePlan(g, uid, name) {
  if (!g) return { error: 'Tông môn không tồn tại' };
  if (!isGuildLeader(g, uid, name)) return { error: 'Chỉ Bang Chủ mới có quyền này', code: 'permission-denied' };
  return { members: Array.isArray(g.members) ? g.members.slice(0, 100) : [] };
}
// Giới hạn tần suất (cửa sổ cố định): state = { start, count }. Trả { ok, next } hoặc { ok:false, retryMs }.
function rateLimitPlan(state, now, max, windowMs) {
  const st = state && now - state.start < windowMs ? state : { start: now, count: 0 };
  if (st.count >= max) return { ok: false, retryMs: st.start + windowMs - now };
  return { ok: true, next: { start: st.start, count: st.count + 1 } };
}
// Phát hiện bất thường (heuristic, KHÔNG phải bằng chứng gian lận): đúng tuyệt đối với tốc độ trung bình quá nhanh.
// Đề do người dùng tự tạo nên server không biết đáp án đúng; đây chỉ là tín hiệu để ghi nhận và tạm dừng thưởng khi lặp lại.
const QUIZ_FLAG = { minTotal: 10, fastSecPerQ: 3, maxFlagsPerDay: 5 };
function quizAnomaly(correct, total, elapsedMs) {
  const flags = [];
  const avg = total > 0 ? elapsedMs / 1000 / total : Infinity;
  if (total >= QUIZ_FLAG.minTotal && correct === total && avg < QUIZ_FLAG.fastSecPerQ) flags.push('perfect_fast');
  return { flags, avgSecPerQ: Math.round(avg * 10) / 10 };
}
// Phát hiện cày lặp một bộ câu hỏi: đếm theo (ngày, dấu vân tay). Chỉ GHI CỜ (không đổi thưởng, không tính vào ngưỡng tạm dừng).
const REPEAT_FLAG_AFTER = 8, REPEAT_MAX_KEYS = 50;
function repeatPlan(state, day, fp, after = REPEAT_FLAG_AFTER) {
  if (typeof fp !== 'string' || !fp) return { next: null, flagged: false, count: 0 };
  const st = state && state.day === day && state.counts ? state : { day, counts: {} };
  const counts = { ...st.counts };
  if (!(fp in counts) && Object.keys(counts).length >= REPEAT_MAX_KEYS) return { next: st, flagged: false, count: 0 };
  counts[fp] = (counts[fp] || 0) + 1;
  return { next: { day, counts }, flagged: counts[fp] > after, count: counts[fp] };
}
// Hộ chuỗi: các phương án khôi phục. Trả về cập nhật hồ sơ hoặc {error}.
function restoreStreakPlan(u, method, now) {
  const today = vnDate(now), yesterday = vnDate(now - 86400e3);
  if (!u.lastPlayedDate || !(u.streakCount > 0) || u.streakRestorePending || u.lastPlayedDate === today || u.lastPlayedDate === yesterday) return { error: 'Chuỗi không cần/không thể khôi phục' };
  const old = u.streakCount;
  if (method === 'study') return { set: { streakRestorePending: true } };
  if (method === 'dismiss') return { set: { streakCount: 0 } };
  if (method === 'shield') return buffActive(u, 'tay_tuy_dan', now) ? { set: { lastPlayedDate: yesterday, 'buffs.tay_tuy_dan': 0 } } : { error: 'Không có Tẩy Tủy Đan đang hiệu lực' };
  if (method === 'spirit') { const c = Math.min(old * 20, 2000); return (u.spirit || 0) >= c ? { spirit: -c, set: { lastPlayedDate: yesterday } } : { error: 'Không đủ Linh Thạch' }; }
  if (method === 'fame') { const c = Math.min(old * 5, 500); return (u.fame || 0) >= c ? { fame: -c, set: { lastPlayedDate: yesterday } } : { error: 'Không đủ Danh Vọng' }; }
  return { error: 'Phương án không hợp lệ' };
}
module.exports = { vnDate, guildPerkCost, guildUpgradePlan, guildJoinPlan, repeatPlan, REPEAT_FLAG_AFTER, QUIZ_FLAG, quizAnomaly, isGuildLeader, guildKickPlan, guildTransferPlan, guildDissolvePlan, rateLimitPlan, GACHA_COST, gachaOutcome, restoreStreakPlan, streakUpdate, examWindowOpen, examDailyScore, rankBonusPercent, buffActive, buffMult, x2Active, quizReward, vnDay, applyDailyCap, rankUpgrade, purchasePlan };
