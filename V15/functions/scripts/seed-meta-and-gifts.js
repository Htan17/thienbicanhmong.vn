// Chạy MỘT LẦN với Admin SDK (GOOGLE_APPLICATION_CREDENTIALS) lên STAGING trước:  node scripts/seed-meta-and-gifts.js
// Tạo mốc mùa nếu chưa có. KHÔNG nhập lại GIFT_CODES cũ (đã lộ trong bundle client): tự phát mã mới bằng `--gift CODE s f maxUses`.
const admin = require('firebase-admin'); admin.initializeApp(); const db = admin.firestore();
(async () => {
  const now = Date.now();
  for (const [k, ms] of [['season', 48 * 3600e3], ['guildSeason', 3 * 24 * 3600e3], ['examPathDaily', 24 * 3600e3]]) {
    const r = db.doc(`meta/${k}`); if (!(await r.get()).exists) { await r.set({ nextReset: now + ms }); console.log('created meta/' + k); }
  }
  const i = process.argv.indexOf('--gift');
  if (i > 0) { const [code, s, f, max] = process.argv.slice(i + 1); await db.doc(`giftCodes/${code.toUpperCase()}`).set({ s: +s || 0, f: +f || 0, maxUses: max ? +max : null, uses: 0 }); console.log('gift', code); }
})();
