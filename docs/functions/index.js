// Cloud Functions — Thiên Kiêu Bí Cảnh V13 (Node 20, firebase-functions v2). Cần gói Blaze.
// TRẠNG THÁI: đã viết code; CHƯA chạy trên emulator/staging (xem docs/KNOWN_ISSUES.md). Logic thuần đã có unit test (test/economy.test.js).
// QUY ƯỚC GIAO DỊCH: mọi transaction ĐỌC HẾT trước, GHI sau. Mọi callable ghi có requestId (idempotency) và nhật ký users/{uid}/ledger/{requestId}.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const C = require('./lib/catalog');
const E = require('./lib/economy');
const A = require('./lib/admin');
const { equipPlan } = require('./lib/equip');
admin.initializeApp();
const db = admin.firestore(); const FV = admin.firestore.FieldValue;
const { FUNCTIONS_REGION: REGION } = require('./lib/config');
const opts = { region: REGION };
const LIMITS = { maxQuestions: 300, secPerQuestion: 2, maxSpiritPerDay: 30000, maxFamePerDay: 1500, sessionTtlMs: 6 * 3600e3 };

const uidOf = (req) => { if (!req.auth) throw new HttpsError('unauthenticated', 'Cần đăng nhập'); return req.auth.uid; };
const bad = (m) => new HttpsError('invalid-argument', m);
const int = (v, lo, hi, name = 'giá trị') => { if (!Number.isInteger(v) || v < lo || v > hi) throw bad(`${name} không hợp lệ`); return v; };
const reqId = (v) => { if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) throw bad('requestId không hợp lệ'); return v; };
const fail = (m) => new HttpsError('failed-precondition', m);
const ledgerRef = (uid, id) => db.doc(`users/${uid}/ledger/${id}`);
// Ghi nhật ký (gọi trong khối GHI của transaction)
const logTx = (tx, uid, id, type, detail, result) => tx.set(ledgerRef(uid, id), { type, detail, result: result || null, at: FV.serverTimestamp() });

// Quản trị: Custom Claim `admin` (cấp bằng functions/scripts/grant-admin.js). Giai đoạn chuyển tiếp vẫn chấp nhận admins/{uid}.role == 'admin'.
async function requireAdmin(req) {
  const uid = uidOf(req);
  if (A.isAdminToken(req.auth.token)) return uid;
  const d = await db.doc(`admins/${uid}`).get();
  if (d.exists && (d.data() || {}).role === 'admin') return uid;
  throw new HttpsError('permission-denied', 'Chỉ quản trị viên');
}

// Giới hạn tần suất theo người dùng + loại thao tác (lưu users/{uid}/serverState/rate_<key>); gọi TRONG transaction, trước mọi lệnh ghi.
async function rateGate(tx, uid, key, max, windowMs) {
  const ref = db.doc(`users/${uid}/serverState/rate_${key}`); const snap = await tx.get(ref);
  const r = E.rateLimitPlan(snap.exists ? snap.data() : null, Date.now(), max, windowMs);
  if (!r.ok) throw new HttpsError('resource-exhausted', `Thao tác quá nhanh, thử lại sau ${Math.ceil(r.retryMs / 1000)} giây`);
  return () => tx.set(ref, r.next); // trả hàm ghi để gọi trong khối GHI
}

// Chạy một giao dịch idempotent: đọc ledger trước; nếu đã xử lý thì trả kết quả cũ.
async function idempotent(uid, id, body) {
  return db.runTransaction(async (tx) => {
    const led = await tx.get(ledgerRef(uid, id));
    if (led.exists) return { ...(led.data().result || {}), replay: true };
    return body(tx);
  });
}

// ===== Quiz: startQuiz (phát phiên 1 lần) + claimQuizReward =====
exports.startQuiz = onCall(opts, async (req) => {
  const uid = uidOf(req); const total = int(req.data && req.data.total, 1, LIMITS.maxQuestions, 'total');
  const fp = typeof (req.data && req.data.fingerprint) === 'string' && /^[a-z0-9]{3,16}$/.test(req.data.fingerprint) ? req.data.fingerprint : null;
  const ref = db.collection(`users/${uid}/quizSessions`).doc();
  await db.runTransaction(async (tx) => { const rl = await rateGate(tx, uid, 'startQuiz', 60, 600e3); rl(); tx.set(ref, { total, startedAt: Date.now(), used: false, ...(fp ? { fp } : {}) }); });
  return { sessionId: ref.id };
});
// KHÔNG tin số tiền/điểm từ client. `correct` do client khai KHÔNG kiểm chứng được (đề/đáp án nằm ở client, kể cả đề cá nhân/AI)
// => lượt học được đánh dấu verified:false, bị giới hạn: phiên 1 lần, thời lượng tối thiểu, trần LT/DV mỗi ngày.
exports.claimQuizReward = onCall(opts, async (req) => {
  const uid = uidOf(req); const d = req.data || {};
  const sid = String(d.sessionId || ''); if (!/^[A-Za-z0-9]{10,40}$/.test(sid)) throw bad('sessionId');
  const correct = int(d.correct, 0, LIMITS.maxQuestions, 'correct'); const wantExamPath = d.examPath === true;
  return idempotent(uid, 'quiz_' + sid, async (tx) => {
    const sRef = db.doc(`users/${uid}/quizSessions/${sid}`), uRef = db.doc(`users/${uid}`), stRef = db.doc(`users/${uid}/serverState/rewards`);
    const cheatRef = db.doc(`users/${uid}/serverState/cheat`), repRef = db.doc(`users/${uid}/serverState/repeat`);
    const [s, u, st, ch, rep] = await Promise.all([tx.get(sRef), tx.get(uRef), tx.get(stRef), tx.get(cheatRef), tx.get(repRef)]);
    if (!s.exists || s.data().used) throw fail('Phiên học không hợp lệ hoặc đã nhận thưởng');
    const { total, startedAt } = s.data(); const now = Date.now();
    if (correct > total) throw bad('correct > total');
    if (now - startedAt > LIMITS.sessionTtlMs) throw fail('Phiên học đã hết hạn');
    if (now - startedAt < total * LIMITS.secPerQuestion * 1000) throw fail('Hoàn thành quá nhanh');
    if (!u.exists) throw fail('Chưa có hồ sơ');
    const user = u.data();
    const guildRef = user.guild ? db.doc(`guilds/${user.guild}`) : null;
    const g = guildRef ? await tx.get(guildRef) : null; // đọc nốt trước khi ghi
    const day = new Date(now + 7 * 3600e3).toISOString().slice(0, 10); const chState = ch.exists && ch.data().day === day ? ch.data() : { day, count: 0 };
    if (chState.count >= E.QUIZ_FLAG.maxFlagsPerDay) throw fail('Hoạt động bất thường, tạm dừng nhận thưởng quiz hôm nay. Nếu nhầm, hãy liên hệ quản trị viên.');
    const anomaly = E.quizAnomaly(correct, total, now - startedAt);
    const r = E.quizReward(user, correct, total, now);
    const cap = E.applyDailyCap(st.exists ? st.data() : null, now, r, { spirit: LIMITS.maxSpiritPerDay, fame: LIMITS.maxFamePerDay });
    const rp = E.repeatPlan(rep.exists ? rep.data() : null, day, s.data().fp);
    // ---- GHI ----
    if (rp.next) tx.set(repRef, rp.next);
    if (rp.flagged) tx.set(db.collection('cheatFlags').doc(), { uid, session: sid, flags: ['repeat_content'], correct, total, repeatCount: rp.count, at: Date.now() }); // chỉ ghi nhật ký, không tạm dừng thưởng
    if (anomaly.flags.length) {
      tx.set(cheatRef, { day, count: chState.count + 1 });
      tx.set(db.collection('cheatFlags').doc(), { uid, session: sid, flags: anomaly.flags, correct, total, avgSecPerQ: anomaly.avgSecPerQ, at: Date.now() });
    }
    const upd = { spirit: FV.increment(cap.s), fame: FV.increment(cap.f), seasonScore: FV.increment(r.season), currentSession: FV.delete() };
    let streak = { streakCount: user.streakCount || 0 }, examCounted = null;
    if (r.lesson) {
      upd.seasonLessons = FV.increment(1);
      streak = E.streakUpdate(user, now);
      upd.streakCount = streak.streakCount; upd.lastPlayedDate = streak.lastPlayedDate;
      if (streak.clearPending) upd.streakRestorePending = FV.delete();
    }
    // Đạo Hữu Bảng: chỉ khi client khai là lượt Đạo Lộ VÀ hồ sơ có examPath VÀ trong khung 4h–23h VN; thời gian do server đo.
    if (wantExamPath && user.examPath) { examCounted = E.examWindowOpen(now); if (examCounted) upd.examPathDailyScore = FV.increment(E.examDailyScore(startedAt, now, total)); }
    tx.update(uRef, upd);
    if (g && g.exists && (g.data().members || []).includes(uid) && correct > 0) tx.update(guildRef, { exp: FV.increment(correct) });
    tx.update(sRef, { used: true, usedAt: now });
    tx.set(stRef, cap.next, { merge: true });
    const result = { stones: cap.s, fame: cap.f, season: r.season, streakCount: streak.streakCount, examPathCounted: examCounted, verified: false };
    logTx(tx, uid, 'quiz_' + sid, 'quiz', { correct, total, ...result }, result);
    return result;
  });
});

// ===== Thưởng lưu bài học video (lần đầu mỗi link) =====
exports.claimVideoReward = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  const link = String((req.data && req.data.link) || '').trim().slice(0, 500); if (!/^https?:\/\//.test(link)) throw bad('link');
  const key = Buffer.from(link).toString('base64url').slice(0, 100);
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), cRef = db.doc(`users/${uid}/serverState/videoClaims`), stRef = db.doc(`users/${uid}/serverState/rewards`);
    const [u, c, st] = await Promise.all([tx.get(uRef), tx.get(cRef), tx.get(stRef)]);
    if (!u.exists) throw fail('Chưa có hồ sơ');
    if (c.exists && c.data()[key]) return { spirit: 0, already: true };
    const now = Date.now(), user = u.data();
    let g = 100; if (E.x2Active(user, now)) g *= 2; g = Math.round(g * E.buffMult(user, 'spirit', now));
    const cap = E.applyDailyCap(st.exists ? st.data() : null, now, { stones: g, fame: 0 }, { spirit: LIMITS.maxSpiritPerDay, fame: LIMITS.maxFamePerDay });
    tx.update(uRef, { spirit: FV.increment(cap.s) });
    tx.set(cRef, { [key]: now }, { merge: true }); tx.set(stRef, cap.next, { merge: true });
    const result = { spirit: cap.s }; logTx(tx, uid, id, 'video', result, result);
    return result;
  });
});

// ===== Thưởng ôn SRS: trần cứng mỗi lần (client khai báo, KHÔNG kiểm chứng được) =====
exports.claimSrsReward = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  const spirit = int(req.data.spirit || 0, 0, 5000, 'spirit'), fame = int(req.data.fame || 0, 0, 500, 'fame'), ct = int(req.data.ct || 0, 0, 100, 'ct');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), stRef = db.doc(`users/${uid}/serverState/rewards`);
    const [u, st] = await Promise.all([tx.get(uRef), tx.get(stRef)]);
    if (!u.exists) throw fail('Chưa có hồ sơ');
    const gName = u.data().guild; const gRef = gName ? db.doc(`guilds/${gName}`) : null; const g = gRef ? await tx.get(gRef) : null;
    const cap = E.applyDailyCap(st.exists ? st.data() : null, Date.now(), { stones: spirit, fame }, { spirit: LIMITS.maxSpiritPerDay, fame: LIMITS.maxFamePerDay });
    tx.update(uRef, { spirit: FV.increment(cap.s), fame: FV.increment(cap.f) });
    if (g && g.exists && ct > 0 && (g.data().members || []).includes(uid)) tx.update(gRef, { exp: FV.increment(ct) });
    tx.set(stRef, cap.next, { merge: true });
    const result = { spirit: cap.s, fame: cap.f, verified: false }; logTx(tx, uid, id, 'srs', result, result);
    return result;
  });
});

// ===== Mã quà: giftCodes/{CODE} = { s, f, maxUses?, uses, disabled? } — client không đọc được =====
exports.redeemGiftCode = onCall(opts, async (req) => {
  const uid = uidOf(req); const code = String((req.data && req.data.code) || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,40}$/.test(code)) throw bad('Mã không hợp lệ');
  return db.runTransaction(async (tx) => {
    const cRef = db.doc(`giftCodes/${code}`), uRef = db.doc(`users/${uid}`);
    const [c, u] = await Promise.all([tx.get(cRef), tx.get(uRef)]);
    if (!c.exists || c.data().disabled) throw new HttpsError('not-found', 'Mã không hợp lệ');
    if (c.data().expiresAt && Date.now() > c.data().expiresAt) throw fail('Mã đã hết hạn');
    if (!u.exists) throw fail('Chưa có hồ sơ');
    if ((u.data().usedCodes || []).includes(code)) throw new HttpsError('already-exists', 'Đã dùng mã này');
    const { s = 0, f = 0, maxUses = null, uses = 0 } = c.data();
    if (maxUses !== null && uses >= maxUses) throw fail('Mã đã hết lượt');
    tx.update(uRef, { spirit: FV.increment(s), fame: FV.increment(f), usedCodes: FV.arrayUnion(code) });
    tx.update(cRef, { uses: FV.increment(1) });
    logTx(tx, uid, 'gift_' + code + '_' + Date.now(), 'gift', { code, s, f }, { s, f });
    return { s, f };
  });
});

// ===== Ải ôn tập video: máy chủ tính thưởng (rank/x2/buff), giới hạn theo ngày, chống gọi lặp =====
// GIỚI HẠN THỰC TẾ: ải do client dựng từ bản dịch của người dùng nên server không thể kiểm chứng số câu đúng;
// chỉ chặn bằng: total<=6, mỗi requestId một lần, trần Linh Thạch/Danh Vọng mỗi ngày (LIMITS).
exports.claimVideoQuizRound = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  const total = int(req.data && req.data.total, 1, 6, 'total'); const score = int(req.data && req.data.score, 0, total, 'score');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), stRef = db.doc(`users/${uid}/serverState/rewards`);
    const [u, st] = await Promise.all([tx.get(uRef), tx.get(stRef)]); if (!u.exists) throw fail('Chưa có hồ sơ');
    const now = Date.now(), r = E.quizReward(u.data(), score, total, now);
    const cap = E.applyDailyCap(st.exists ? st.data() : null, now, { stones: r.stones, fame: r.fame }, { spirit: LIMITS.maxSpiritPerDay, fame: LIMITS.maxFamePerDay });
    if (cap.s || cap.f) tx.update(uRef, { spirit: FV.increment(cap.s), fame: FV.increment(cap.f) });
    tx.set(stRef, cap.next, { merge: true });
    const result = { stones: cap.s, fame: cap.f }; logTx(tx, uid, id, 'videoQuizRound', { score, total, ...result }, result);
    return result;
  });
});

// ===== Trang bị / tháo trang bị: server kiểm tra sở hữu, client không tự ghi các trường trang bị khác rỗng =====
exports.equipItem = onCall(opts, async (req) => {
  const uid = uidOf(req); const d = req.data || {};
  const slot = typeof d.slot === 'string' ? d.slot : ''; const itemId = d.itemId == null ? '' : d.itemId; if (typeof itemId !== 'string' || itemId.length > 64) throw bad('Vật phẩm không hợp lệ');
  return db.runTransaction(async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef); if (!u.exists) throw fail('Chưa có hồ sơ');
    const rl = await rateGate(tx, uid, 'equip', 60, 60e3);
    const plan = equipPlan(slot, itemId, u.data().inventory); if (plan.error) throw fail(plan.error);
    rl(); tx.update(uRef, { [plan.field]: plan.value });
    return { slot, field: plan.field, value: plan.value };
  });
});

// ===== Cửa hàng =====
exports.purchaseItem = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const itemId = String((req.data && req.data.itemId) || '').slice(0, 40);
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef);
    if (!u.exists) throw fail('Chưa có hồ sơ');
    const plan = E.purchasePlan(u.data(), itemId, Date.now()); if (plan.error) throw fail(plan.error);
    tx.update(uRef, { spirit: FV.increment(-plan.price), inventory: plan.inventory, dailyPurchases: plan.dailyPurchases });
    const result = { itemId, price: plan.price }; logTx(tx, uid, id, 'purchase', result, result);
    return result;
  });
});
exports.buyRank = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const rankId = String((req.data && req.data.rankId) || '');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef); if (!u.exists) throw fail('Chưa có hồ sơ');
    const p = E.rankUpgrade(u.data(), rankId); if (p.error) throw fail(p.error);
    tx.update(uRef, { spirit: FV.increment(p.spirit), fame: FV.increment(p.fame), rank: rankId });
    const result = { rank: rankId }; logTx(tx, uid, id, 'rank', result, result);
    return result;
  });
});
// Kích hoạt bùa từ túi đồ (buff theo giờ hoặc Bùa Nhân Đôi)
exports.activateBuff = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const itemId = String((req.data && req.data.itemId) || '');
  if (!C.BUFF_DEFS[itemId] && itemId !== 'x2_card') throw bad('Vật phẩm không kích hoạt được');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef); if (!u.exists) throw fail('Chưa có hồ sơ');
    const user = u.data(), inv = [...(user.inventory || [])], i = inv.indexOf(itemId); if (i < 0) throw fail('Không có vật phẩm này');
    const now = Date.now(); inv.splice(i, 1);
    const upd = { inventory: inv };
    if (itemId === 'x2_card') { if (E.x2Active(user, now)) throw fail('Bùa Nhân Đôi đang có hiệu lực'); upd.x2BoostExpiresAt = now + C.X2_DURATION_MS; }
    else { const cur = (user.buffs && user.buffs[itemId]) || 0; upd['buffs.' + itemId] = Math.min(Math.max(cur, now) + C.BUFF_DEFS[itemId].hours * 3600e3, now + C.BUFF_MAX_STACK_MS); }
    tx.update(uRef, upd);
    const result = { itemId }; logTx(tx, uid, id, 'activate', result, result);
    return result;
  });
});

// ===== Đổi tên (1000 LT + 100 DV), giữ tính duy nhất qua usernames/{name} =====
exports.renameUser = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const name = String((req.data && req.data.name) || '').trim().toLowerCase();
  if (!/^[a-z0-9]{3,30}$/.test(name)) throw bad('Đạo hiệu chỉ gồm chữ không dấu/số, 3–30 ký tự');
  // TODO: lọc từ khoá/tên dành riêng phía server (hiện chỉ có ở src/lib/contentFilter.js)
  const dup = await db.collection('users').where('name', '==', name).limit(1).get();
  if (!dup.empty && dup.docs[0].id !== uid) throw fail('Đạo hiệu đã tồn tại');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), nRef = db.doc(`usernames/${name}`); const [u, n] = await Promise.all([tx.get(uRef), tx.get(nRef)]);
    if (!u.exists) throw fail('Chưa có hồ sơ'); const user = u.data();
    if (n.exists && n.data().uid !== uid) throw fail('Đạo hiệu đã tồn tại');
    if ((user.spirit || 0) < 1000 || (user.fame || 0) < 100) throw fail('Không đủ 1000 Linh Thạch & 100 Danh Vọng');
    const oldRef = user.name ? db.doc(`usernames/${user.name}`) : null; const old = oldRef ? await tx.get(oldRef) : null;
    tx.update(uRef, { name, spirit: FV.increment(-1000), fame: FV.increment(-100) });
    tx.set(nRef, { uid }); if (old && old.exists && old.data().uid === uid && old.id !== name) tx.delete(oldRef);
    const result = { name }; logTx(tx, uid, id, 'rename', result, result);
    return result;
  });
});

// ===== Gacha: server sinh số ngẫu nhiên, trừ phí và trao thưởng trong một transaction =====
exports.rollGacha = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef); if (!u.exists) throw fail('Chưa có hồ sơ');
    const rl = await rateGate(tx, uid, 'gacha', 20, 60e3);
    if ((u.data().spirit || 0) < E.GACHA_COST) throw fail(`Không đủ ${E.GACHA_COST} Linh Thạch`);
    const hasX2 = (u.data().inventory || []).includes('x2_card');
    const o = E.gachaOutcome(require('crypto').randomInt(0, 1e9) / 1e9, hasX2);
    rl();
    const upd = { spirit: FV.increment(o.spirit - E.GACHA_COST) };
    if (o.fame) upd.fame = FV.increment(o.fame);
    if (o.x2) upd.inventory = FV.arrayUnion('x2_card');
    tx.update(uRef, upd);
    const result = { text: o.text, spirit: o.spirit - E.GACHA_COST, fame: o.fame, x2: o.x2 }; logTx(tx, uid, id, 'gacha', result, result);
    return result;
  });
});

// ===== Tông Môn =====
const guildName = (v) => { const s = String(v || '').replace(/[\/\.\#\$\[\]]/g, '').trim(); if (!s || s.length > 30) throw bad('Tên Tông môn không hợp lệ'); return s; };
exports.createGuild = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const name = guildName(req.data && req.data.name);
  // TODO: lọc từ khoá/tên dành riêng phía server
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), gRef = db.doc(`guilds/${name}`); const [u, g] = await Promise.all([tx.get(uRef), tx.get(gRef)]);
    if (!u.exists) throw fail('Chưa có hồ sơ'); if (g.exists) throw fail('Tên Tông môn đã tồn tại');
    if (u.data().guild) throw fail('Đã ở trong một Tông môn'); if ((u.data().spirit || 0) < 500) throw fail('Không đủ 500 Linh Thạch');
    const guildId = String(Math.floor(100000 + Math.random() * 900000));
    tx.set(gRef, { name, level: 1, members: [uid], leader: uid, guildId, notice: 'Chào mừng đến với tông môn!', exp: 0 });
    tx.update(uRef, { spirit: FV.increment(-500), guild: name });
    const result = { guildId, name }; logTx(tx, uid, id, 'createGuild', result, result);
    return result;
  });
});
exports.joinGuild = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  const key = String((req.data && req.data.guild) || '').trim(); if (!key || key.length > 40 || /[\/]/.test(key)) throw bad('Mã hoặc tên Tông môn không hợp lệ');
  const inviteId = req.data && req.data.inviteId != null ? String(req.data.inviteId).slice(0, 64) : null;
  // Tìm Tông môn theo tên (doc id) hoặc mã mời 6 số; tra cứu ngoài transaction, đọc lại bên trong để xác thực.
  let gName = null;
  const byName = await db.doc(`guilds/${key}`).get();
  if (byName.exists) gName = key; else { const q = await db.collection('guilds').where('guildId', '==', key).limit(1).get(); if (!q.empty) gName = q.docs[0].id; }
  if (!gName) throw fail('Không tìm thấy Tông môn');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), gRef = db.doc(`guilds/${gName}`); const [u, g] = await Promise.all([tx.get(uRef), tx.get(gRef)]);
    if (!u.exists) throw fail('Chưa có hồ sơ');
    const rl = await rateGate(tx, uid, 'joinGuild', 10, 60e3);
    const plan = E.guildJoinPlan(g.exists ? g.data() : null, uid, u.data().guild); if (plan.error) throw fail(plan.error);
    rl();
    tx.update(gRef, { members: plan.members });
    const upd = { guild: gName };
    if (inviteId) upd.requests = (u.data().requests || []).filter((r) => String(r && r.id) !== inviteId);
    tx.update(uRef, upd);
    tx.delete(db.doc(`users/${uid}/guildInvites/${gName}`)); // lời mời (nếu có) đã dùng xong
    const result = { joined: gName }; logTx(tx, uid, id, 'joinGuild', result, result);
    return result;
  });
});
exports.leaveGuild = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef); if (!u.exists) throw fail('Chưa có hồ sơ');
    const name = u.data().guild; if (!name) throw fail('Không ở trong Tông môn nào');
    if ((u.data().spirit || 0) < 500) throw fail('Không đủ tài sản để nộp phạt 500 Linh Thạch');
    const gRef = db.doc(`guilds/${name}`); const g = await tx.get(gRef); // đọc xong mọi thứ rồi mới ghi
    if (g.exists) {
      const rest = (g.data().members || []).filter((m) => m !== uid);
      if (rest.length === 0) tx.delete(gRef); else tx.update(gRef, { members: rest, leader: g.data().leader === uid ? rest[0] : g.data().leader });
    }
    tx.update(uRef, { spirit: FV.increment(-500), guild: null });
    const result = { left: name }; logTx(tx, uid, id, 'leaveGuild', result, result);
    return result;
  });
});
// ----- Tông Môn: quyền được xác định từ guild.leader trong Firestore (không tin vai trò client gửi) -----
const leaderOnly = (g, uid) => { if (!g.exists) throw fail('Tông môn không tồn tại'); if (g.data().leader !== uid) throw new HttpsError('permission-denied', 'Chỉ Bang Chủ mới có quyền này'); };
// ----- Tông Môn: trục xuất / chuyển Bang Chủ / giải tán (quyền do server xác định từ guild.leader) -----
const planErr = (p) => (p.code === 'permission-denied' ? new HttpsError('permission-denied', p.error) : fail(p.error));
const targetUidOf = (v) => { if (typeof v !== 'string' || !v || v.length > 128 || /[\/]/.test(v)) throw bad('Người nhận không hợp lệ'); return v; };
exports.kickGuildMember = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const target = targetUidOf(req.data && req.data.targetUid);
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`), tRef = db.doc(`users/${target}`); const [u, t] = await Promise.all([tx.get(uRef), tx.get(tRef)]); if (!u.exists) throw fail('Chưa có hồ sơ');
    const gRef = db.doc(`guilds/${u.data().guild || '_'}`); const g = await tx.get(gRef);
    const rl = await rateGate(tx, uid, 'guildAdmin', 30, 60e3);
    const plan = E.guildKickPlan(g.exists ? g.data() : null, uid, u.data().name, target); if (plan.error) throw planErr(plan);
    rl(); tx.update(gRef, { members: plan.members }); if (t.exists && t.data().guild === gRef.id) tx.update(tRef, { guild: null });
    const result = { kicked: target }; logTx(tx, uid, id, 'guildKick', result, result); return result;
  });
});
exports.transferGuildLeader = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const target = targetUidOf(req.data && req.data.targetUid);
  return idempotent(uid, id, async (tx) => {
    const u = await tx.get(db.doc(`users/${uid}`)); if (!u.exists) throw fail('Chưa có hồ sơ');
    const gRef = db.doc(`guilds/${u.data().guild || '_'}`); const g = await tx.get(gRef);
    const rl = await rateGate(tx, uid, 'guildAdmin', 30, 60e3);
    const plan = E.guildTransferPlan(g.exists ? g.data() : null, uid, u.data().name, target); if (plan.error) throw planErr(plan);
    rl(); tx.update(gRef, { leader: plan.leader });
    const result = { leader: plan.leader }; logTx(tx, uid, id, 'guildTransfer', result, result); return result;
  });
});
exports.dissolveGuild = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  return idempotent(uid, id, async (tx) => {
    const u = await tx.get(db.doc(`users/${uid}`)); if (!u.exists) throw fail('Chưa có hồ sơ');
    const gRef = db.doc(`guilds/${u.data().guild || '_'}`); const g = await tx.get(gRef);
    const plan = E.guildDissolvePlan(g.exists ? g.data() : null, uid, u.data().name); if (plan.error) throw planErr(plan);
    const refs = plan.members.map((m) => db.doc(`users/${m}`)); const ms = refs.length ? await tx.getAll(...refs) : [];
    ms.forEach((m) => { if (m.exists && m.data().guild === gRef.id) tx.update(m.ref, { guild: null }); });
    tx.delete(gRef);
    const result = { dissolved: gRef.id }; logTx(tx, uid, id, 'guildDissolve', result, result); return result;
  });
});
exports.upgradeGuild = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  return idempotent(uid, id, async (tx) => {
    const uSnap = await tx.get(db.doc(`users/${uid}`)); if (!uSnap.exists) throw fail('Chưa có hồ sơ');
    const gRef = db.doc(`guilds/${uSnap.data().guild || '_'}`); const g = await tx.get(gRef); leaderOnly(g, uid);
    const refs = (g.data().members || []).slice(0, 50).map((m) => db.doc(`users/${m}`)); const ms = refs.length ? await tx.getAll(...refs) : [];
    const plan = E.guildUpgradePlan(g.data(), ms.map((m) => (m.exists ? m.data().rank : null))); if (plan.error) throw fail(plan.error);
    tx.update(gRef, { level: plan.level });
    const result = { level: plan.level }; logTx(tx, uid, id, 'guildUpgrade', result, result); return result;
  });
});
exports.buyGuildPerk = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId);
  const perkType = String((req.data && req.data.perkType) || ''), value = req.data && typeof req.data.value === 'string' ? req.data.value.slice(0, 40) : null;
  if (value === null) throw bad('value');
  const cost = E.guildPerkCost(perkType, value); if (cost.error) throw bad(cost.error);
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const uSnap = await tx.get(uRef); if (!uSnap.exists) throw fail('Chưa có hồ sơ');
    const gRef = db.doc(`guilds/${uSnap.data().guild || '_'}`); const g = await tx.get(gRef); leaderOnly(g, uid);
    if ((cost.spirit || 0) > (uSnap.data().spirit || 0)) throw fail('Không đủ Linh Thạch');
    if ((cost.exp || 0) > (g.data().exp || 0)) throw fail('Tông môn không đủ Công Trạng');
    const gUpd = { [perkType]: value }; if (cost.exp) gUpd.exp = FV.increment(-cost.exp);
    tx.update(gRef, gUpd); if (cost.spirit) tx.update(uRef, { spirit: FV.increment(-cost.spirit) });
    const result = { perkType, value }; logTx(tx, uid, id, 'guildPerk', { ...result, cost }, result); return result;
  });
});
exports.exchangeGuildExp = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const offerId = String((req.data && req.data.offerId) || '');
  const o = C.GUILD_OFFERS[offerId]; if (!o) throw bad('Phần thưởng không tồn tại');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const uSnap = await tx.get(uRef); if (!uSnap.exists) throw fail('Chưa có hồ sơ');
    const gRef = db.doc(`guilds/${uSnap.data().guild || '_'}`); const g = await tx.get(gRef); leaderOnly(g, uid);
    if ((g.data().exp || 0) < o.cost) throw fail('Tông môn không đủ Công Trạng');
    const inv = uSnap.data().inventory || []; const upd = {}; let note = '';
    if (o.type === 'spirit') upd.spirit = FV.increment(o.value);
    else if (o.type === 'x2') upd.inventory = [...inv, 'x2_card', 'x2_card'];
    else if (inv.includes(o.value)) { upd.spirit = FV.increment(2000); note = 'duplicate_refund'; } else upd.inventory = [...inv, o.value];
    tx.update(gRef, { exp: FV.increment(-o.cost) }); tx.update(uRef, upd);
    const result = { offerId, note }; logTx(tx, uid, id, 'guildExchange', result, result); return result;
  });
});
// ----- Khôi phục chuỗi điểm danh -----
exports.restoreStreak = onCall(opts, async (req) => {
  const uid = uidOf(req); const id = reqId(req.data && req.data.requestId); const method = String((req.data && req.data.method) || '');
  return idempotent(uid, id, async (tx) => {
    const uRef = db.doc(`users/${uid}`); const u = await tx.get(uRef); if (!u.exists) throw fail('Chưa có hồ sơ');
    const p = E.restoreStreakPlan(u.data(), method, Date.now()); if (p.error) throw fail(p.error);
    const upd = { ...p.set }; if (p.spirit) upd.spirit = FV.increment(p.spirit); if (p.fame) upd.fame = FV.increment(p.fame);
    tx.update(uRef, upd); const result = { method }; logTx(tx, uid, id, 'restoreStreak', result, result); return result;
  });
});
// KHÔNG tạo: claimDailyReward (client V13.1 không có tính năng thưởng đăng nhập hằng ngày riêng; chuỗi điểm danh nằm trong claimQuizReward),
// useItem (bùa đã có activateBuff). claimVideoQuizRound: CHƯA làm (xem docs/KNOWN_ISSUES.md).

// ===== Xoá tài khoản =====
exports.deleteAccount = onCall(opts, async (req) => {
  const uid = uidOf(req);
  if (req.data && req.data.confirm !== 'DELETE') throw bad('Cần xác nhận');
  const uSnap = await db.doc(`users/${uid}`).get(); const user = uSnap.data() || {};
  if (user.guild) { // rời tông môn (không phạt khi xoá tài khoản)
    await db.runTransaction(async (tx) => {
      const gRef = db.doc(`guilds/${user.guild}`); const g = await tx.get(gRef); if (!g.exists) return;
      const rest = (g.data().members || []).filter((m) => m !== uid);
      if (rest.length === 0) tx.delete(gRef); else tx.update(gRef, { members: rest, leader: g.data().leader === uid ? rest[0] : g.data().leader });
    });
  }
  if (user.name) { const n = await db.doc(`usernames/${user.name}`).get(); if (n.exists && n.data().uid === uid) await n.ref.delete(); }
  await db.recursiveDelete(db.doc(`users/${uid}`)); // gồm private, srs, friends, friendRequests, ledger...
  // TODO: bản ghi bạn bè đối xứng ở hồ sơ người khác (users/*/friends/{uid}) chưa được dọn — xem KNOWN_ISSUES.
  await admin.auth().deleteUser(uid);
  return { deleted: true };
});

// ===== Mùa giải: CHECKPOINT — nextReset chỉ đẩy lên khi mọi lô đã xong; lỗi giữa chừng thì tick sau chạy tiếp =====
const { runCheckpointed } = require('./lib/checkpoint');
const resetWhere = async (field, patch) => { // idempotent: lặp tới khi không còn bản ghi
  for (;;) { const s = await db.collection('users').where(field, '>', 0).limit(400).get(); if (s.empty) return; const b = db.batch(); s.docs.forEach((d) => b.update(d.ref, patch)); await b.commit(); }
};
exports.finalizeSeason = onSchedule({ region: REGION, schedule: 'every 5 minutes', timeZone: 'Asia/Ho_Chi_Minh', timeoutSeconds: 540 }, async () => {
  await runCheckpointed(db, {
    name: 'season', nextFn: (now) => now + C.SEASON_DURATION,
    snapshot: async () => { // chụp bảng xếp hạng MỘT LẦN, lưu vào run doc (không đổi giữa các lần chạy lại)
      const snap = await db.collection('users').where('seasonScore', '>', 0).orderBy('seasonScore', 'desc').limit(600).get();
      return snap.docs.filter((d) => (d.data().seasonLessons || 0) >= C.LB_MIN_LESSONS).slice(0, 300).map((d, i) => ({ uid: d.id, ...C.seasonRewardFor(i) }));
    },
    applyItem: (b, it) => b.update(db.doc(`users/${it.uid}`), { spirit: FV.increment(it.s), ...(it.f ? { fame: FV.increment(it.f) } : {}) }),
    resetLoop: async () => { await resetWhere('seasonScore', { seasonScore: 0 }); await resetWhere('seasonLessons', { seasonLessons: 0 }); },
  });
});
exports.finalizeGuildSeason = onSchedule({ region: REGION, schedule: 'every 30 minutes' }, async () => {
  await runCheckpointed(db, {
    name: 'guildSeason', nextFn: (now) => now + C.GUILD_SEASON_DURATION,
    snapshot: async () => (await db.collection('guilds').get()).docs.map((d) => ({ id: d.id, level: d.data().level || 1, exp: d.data().exp || 0 })).sort((a, b) => (b.level - a.level) || (b.exp - a.exp)).slice(0, 3).map((g, i) => ({ id: g.id, add: C.GUILD_TIERS[i] })),
    applyItem: (b, it) => b.update(db.doc(`guilds/${it.id}`), { exp: FV.increment(it.add) }),
  });
});
exports.finalizeExamPathDaily = onSchedule({ region: REGION, schedule: 'every 10 minutes', timeZone: 'Asia/Ho_Chi_Minh' }, async () => {
  const next = (now) => { const d = new Date(now + 7 * 3600e3); d.setUTCHours(4, 0, 0, 0); let t = d.getTime() - 7 * 3600e3; if (t <= now) t += 86400e3; return t; };
  await runCheckpointed(db, {
    name: 'examPathDaily', nextFn: next,
    snapshot: async () => (await db.collection('users').where('examPathDailyScore', '>', 0).orderBy('examPathDailyScore', 'desc').limit(3).get()).docs.map((d, i) => ({ uid: d.id, title: C.EXAM_PATH_TITLE_IDS[i] })),
    applyItem: (b, it) => b.update(db.doc(`users/${it.uid}`), { examPathTitles: FV.arrayUnion(it.title) }),
    resetLoop: async () => resetWhere('examPathDailyScore', { examPathDailyScore: 0 }),
  });
});

// ===== Kiểm duyệt (admin): ẩn / khôi phục / bỏ qua báo cáo; MỌI thao tác ghi nhật ký adminAudit (chỉ server ghi) =====
exports.adminModerate = onCall(opts, async (req) => {
  const uid = await requireAdmin(req);
  const plan = A.moderationPlan(req.data); if (plan.error) throw bad(plan.error);
  const batch = db.batch(); const now = FV.serverTimestamp(); const hRef = plan.key ? db.doc(`hiddenContent/${plan.key}`) : null;
  if (plan.action === 'unhide') batch.delete(hRef);
  else {
    if (plan.action === 'hide') batch.set(hRef, { targetType: plan.type, targetId: plan.id, reason: plan.reason, hiddenBy: uid, hiddenAt: now });
    const refs = plan.reportIds.map((r) => db.doc(`reports/${r}`)); const snaps = refs.length ? await db.getAll(...refs) : [];
    snaps.forEach((sn) => { if (sn.exists && (sn.data() || {}).status === 'open') batch.update(sn.ref, { status: plan.action === 'hide' ? 'hidden' : 'dismissed', reviewedBy: uid, reviewedAt: now }); });
  }
  batch.set(db.collection('adminAudit').doc(), { actor: uid, action: plan.action, targetKey: plan.key, reason: plan.reason || null, reports: (plan.reportIds || []).length, at: now });
  await batch.commit();
  return { ok: true, action: plan.action, key: plan.key };
});

// ===== Thống kê nghiên cứu (chỉ admin) — trả đúng hợp đồng mà src/components/ResearchDashboard.jsx đọc =====
// Dùng count()/sum() aggregation + 3 truy vấn top-10; không tải toàn bộ hồ sơ. Định danh người dùng được băm (HS-XXXXXX), không trả uid/tên.
// ĐỊNH NGHĨA: activeUsers(N ngày) = số hồ sơ có users.lastActive trong N ngày (lastActive do client ghi lúc mở app => chỉ là xấp xỉ).
// DAU/WAU/MAU = activeUsers 1/7/30 ngày. Session/retention/completion CHƯA có log nên được khai báo ở `unavailable`, không bịa số.
const crypto = require('crypto');
const hashCode = (uid) => 'HS-' + crypto.createHash('sha256').update('rs:' + uid + (process.env.RS_SALT || '')).digest('hex').slice(0, 6).toUpperCase();
exports.getResearchStats = onCall({ ...opts, timeoutSeconds: 120 }, async (req) => {
  const uid = await requireAdmin(req);
  const now = Date.now(), DAY = 86400e3, AF = admin.firestore.AggregateField;
  const cnt = async (q) => (await q.count().get()).data().count;
  const users = db.collection('users');
  const periodsDays = [7, 14, 30];
  const [totalUsers, learners, guilds, qs, vs, sums, ...rest] = await Promise.all([
    cnt(users), cnt(users.where('studySeconds', '>', 0)), cnt(db.collection('guilds')), cnt(db.collection('quizShares')), cnt(db.collection('videoShares')),
    users.aggregate({ study: AF.sum('studySeconds'), spirit: AF.sum('spirit'), fame: AF.sum('fame'), season: AF.sum('seasonScore'), streak: AF.sum('streakCount') }).get(),
    ...periodsDays.map((d) => cnt(users.where('lastActive', '>=', now - d * DAY))),
    ...periodsDays.map((d) => cnt(db.collection('quizShares').where('createdAt', '>=', now - d * DAY))),
    ...periodsDays.map((d) => cnt(db.collection('videoShares').where('createdAt', '>=', now - d * DAY))),
    ...['studySeconds', 'streakCount', 'seasonScore'].map((f) => users.orderBy(f, 'desc').limit(10).get()),
  ]);
  const act = rest.slice(0, 3), nq = rest.slice(3, 6), nv = rest.slice(6, 9), tops = rest.slice(9);
  const sm = sums.data(); const periods = {};
  periodsDays.forEach((d, i) => { periods[d] = { days: d, activeUsers: act[i], inactiveUsers: Math.max(0, totalUsers - act[i]), newQuizShares: nq[i], newVideoShares: nv[i] }; });
  const topOf = (snap, f) => snap.docs.filter((d) => (d.data()[f] || 0) > 0).map((d) => ({ code: hashCode(d.id), value: d.data()[f] }));
  return {
    generatedAt: now, activeWindowDays: 30, totalUsers, totalStudySeconds: sm.study || 0,
    averageStudySeconds: learners ? Math.round((sm.study || 0) / learners) : 0, learnersCount: learners,
    totalSpirit: sm.spirit || 0, totalFame: sm.fame || 0, totalSeasonScore: sm.season || 0, totalStreak: sm.streak || 0,
    totalQuizShares: qs, totalVideoShares: vs, totalGuilds: guilds,
    activeUsers: periods[30].activeUsers, inactiveUsers: periods[30].inactiveUsers, periods,
    topStudyUsers: topOf(tops[0], 'studySeconds'), topStreakUsers: topOf(tops[1], 'streakCount'), topSeasonUsers: topOf(tops[2], 'seasonScore'),
    unavailable: [
      { key: 'newUsers', missing: 'Hồ sơ chưa có trường createdAt' },
      { key: 'retention', missing: 'Chưa có nhật ký hoạt động theo ngày' },
      { key: 'dailyStudySeconds', missing: 'studySeconds chỉ là số tích lũy, chưa có lịch sử theo ngày' },
      { key: 'quizAttempts', missing: 'Chưa có bộ đếm lượt làm quiz (users/*/ledger mới chỉ có từ V13)' },
      { key: 'lessonCompletionRate', missing: 'Chưa có số bài bắt đầu/hoàn thành' },
    ],
  };
});
