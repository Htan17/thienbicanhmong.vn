/* Cấp / thu hồi quyền quản trị bằng Custom Claim `admin` (chỉ chủ dự án chạy, bằng Admin SDK).
 * Dùng: node scripts/grant-admin.js <uid>            (cấp)
 *       node scripts/grant-admin.js <uid> --revoke   (thu hồi)
 * Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-tkbc node scripts/grant-admin.js <uid>
 * Thật: GOOGLE_APPLICATION_CREDENTIALS + GCLOUD_PROJECT (không commit khoá). Người dùng phải đăng nhập lại (hoặc làm mới token) để claim có hiệu lực.
 * Ghi thêm admins/{uid} {role:'admin'} (đường dự phòng giai đoạn chuyển tiếp) và 1 dòng adminAudit. CHƯA chạy thử trong phiên phát triển.
 */
const admin = require('firebase-admin');
const [uid, flag] = process.argv.slice(2); const revoke = flag === '--revoke';
if (!uid || uid.startsWith('--')) { console.error('Thiếu <uid>'); process.exit(1); }
if (!process.env.GCLOUD_PROJECT) { console.error('Thiếu GCLOUD_PROJECT'); process.exit(1); }
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
(async () => {
  const db = admin.firestore(); const user = await admin.auth().getUser(uid); // lỗi nếu uid không tồn tại
  const claims = { ...(user.customClaims || {}) };
  if (revoke) { delete claims.admin; await admin.auth().setCustomUserClaims(uid, claims); await db.doc(`admins/${uid}`).delete().catch(() => {}); }
  else { claims.admin = true; await admin.auth().setCustomUserClaims(uid, claims); await db.doc(`admins/${uid}`).set({ role: 'admin', grantedAt: admin.firestore.FieldValue.serverTimestamp() }); }
  await db.collection('adminAudit').add({ actor: 'script:grant-admin', action: revoke ? 'revokeAdmin' : 'grantAdmin', targetKey: uid, at: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`${revoke ? 'Đã thu hồi' : 'Đã cấp'} quyền admin cho ${uid}. Yêu cầu người dùng đăng nhập lại.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
