/* Di trú friends/requests (mảng trong users/{uid}) -> subcollection friends / friendRequests / guildInvites
 * Dùng: node scripts/migrate-friends-requests.js            (DRY-RUN, chỉ in ra)
 *       node scripts/migrate-friends-requests.js --apply    (ghi thật)
 * Chạy với Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-tkbc node scripts/migrate-friends-requests.js
 * Với Firebase thật: đặt GOOGLE_APPLICATION_CREDENTIALS + GCLOUD_PROJECT (KHÔNG commit khoá). SAO LƯU Firestore trước.
 * Idempotent: chạy lại không nhân đôi (doc id cố định). Không xoá mảng cũ (thêm --purge-arrays để xoá sau khi kiểm tra).
 * CHƯA CHẠY THỬ trong phiên phát triển này (không có Emulator). Chạy thử trên Emulator trước.
 */
const admin = require('firebase-admin');
const apply = process.argv.includes('--apply'), purge = process.argv.includes('--purge-arrays');
if (!process.env.GCLOUD_PROJECT) { console.error('Thiếu GCLOUD_PROJECT'); process.exit(1); }
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = admin.firestore(); const TS = admin.firestore.FieldValue.serverTimestamp();
(async () => {
  const snap = await db.collection('users').get(); let nF = 0, nR = 0, nG = 0, skipped = 0;
  let batch = db.batch(), ops = 0; const flush = async () => { if (apply && ops) await batch.commit(); batch = db.batch(); ops = 0; };
  const put = async (ref, data) => { if (apply) batch.set(ref, data, { merge: true }); if (++ops >= 400) await flush(); };
  for (const doc of snap.docs) {
    const u = doc.data(), uid = doc.id;
    for (const f of Array.isArray(u.friends) ? u.friends : []) { if (typeof f !== 'string' || !f || f === uid) { skipped++; continue; } nF++; await put(doc.ref.collection('friends').doc(f), { since: TS }); }
    for (const r of Array.isArray(u.requests) ? u.requests : []) {
      if (!r || typeof r !== 'object') { skipped++; continue; }
      if (r.type === 'friend' && typeof r.fromUid === 'string' && r.fromUid) { nR++; await put(doc.ref.collection('friendRequests').doc(r.fromUid), { fromUid: r.fromUid, fromName: String(r.fromName || '').slice(0, 60), type: 'friend', createdAt: TS }); }
      else if (r.type === 'guild' && r.guildId && !String(r.guildId).includes('/')) { nG++; await put(doc.ref.collection('guildInvites').doc(String(r.guildId)), { fromUid: String(r.fromUid || ''), fromName: String(r.fromName || '').slice(0, 60), guildId: String(r.guildId), createdAt: TS }); }
      else skipped++;
    }
    if (apply && purge && (u.friends || u.requests)) { batch.update(doc.ref, { friends: [], requests: [] }); if (++ops >= 400) await flush(); }
  }
  await flush();
  console.log(`${apply ? 'ĐÃ GHI' : 'DRY-RUN'}: friends=${nF} friendRequests=${nR} guildInvites=${nG} bỏ qua=${skipped} (users=${snap.size})${purge ? ' [purge mảng cũ]' : ''}`);
})().catch((e) => { console.error(e); process.exit(1); });
