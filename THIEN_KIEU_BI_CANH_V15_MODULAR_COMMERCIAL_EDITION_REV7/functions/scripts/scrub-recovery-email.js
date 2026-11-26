/* Xoá trường `recoveryEmail` khỏi hồ sơ users/{uid} (trước đây lưu công khai: mọi người đăng nhập đều đọc được -> lộ email thật).
 * Email thật nay chỉ nằm ở Firebase Auth (user.email) sau khi người dùng XÁC MINH.
 * Dùng: node scripts/scrub-recovery-email.js           (DRY-RUN)   |   node scripts/scrub-recovery-email.js --apply
 * Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-tkbc node scripts/scrub-recovery-email.js
 * Thật: GOOGLE_APPLICATION_CREDENTIALS + GCLOUD_PROJECT (không commit khoá). SAO LƯU trước. CHƯA chạy thử trong phiên phát triển. */
const admin = require('firebase-admin'); const apply = process.argv.includes('--apply');
if (!process.env.GCLOUD_PROJECT) { console.error('Thiếu GCLOUD_PROJECT'); process.exit(1); }
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT }); const db = admin.firestore();
(async () => {
  const snap = await db.collection('users').where('recoveryEmail', '>', '').get(); let n = 0, batch = db.batch(), ops = 0;
  for (const d of snap.docs) { n++; if (apply) { batch.update(d.ref, { recoveryEmail: admin.firestore.FieldValue.delete() }); if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; } } }
  if (apply && ops) await batch.commit();
  console.log(`${apply ? 'ĐÃ XOÁ' : 'DRY-RUN'}: ${n} hồ sơ có recoveryEmail.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
