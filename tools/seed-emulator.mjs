// Nạp dữ liệu mẫu vào Firebase Emulator đang chạy (npm run emulators). KHÔNG bao giờ chạy với Production:
// script từ chối chạy nếu thiếu biến môi trường Emulator. Cần đã chạy `npm ci` trong functions/ (dùng firebase-admin ở đó).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.GCLOUD_PROJECT ||= 'demo-tkbc';
if (!/^(127\.0\.0\.1|localhost):/.test(process.env.FIRESTORE_EMULATOR_HOST)) { console.error('Từ chối: FIRESTORE_EMULATOR_HOST không phải localhost.'); process.exit(2); }

let admin;
try { admin = createRequire(path.join(root, 'functions', 'package.json'))('firebase-admin'); }
catch { console.error('Thiếu firebase-admin: chạy `npm ci` trong thư mục functions/.'); process.exit(2); }
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = admin.firestore(), auth = admin.auth();
const seed = JSON.parse(readFileSync(path.join(root, 'tests', 'fixtures', 'emulator-seed.json'), 'utf8'));

for (const u of seed.users) {
  try { await auth.deleteUser(u.uid); } catch { /* chưa tồn tại */ }
  await auth.createUser({ uid: u.uid, email: u.email, password: u.password, displayName: u.doc.name });
  await db.doc('users/' + u.uid).set(u.doc);
}
for (const [p, d] of Object.entries(seed.docs)) await db.doc(p).set(d);
console.log(`Đã nạp ${seed.users.length} tài khoản + ${Object.keys(seed.docs).length} tài liệu mẫu vào Emulator (${process.env.GCLOUD_PROJECT}).`);
process.exit(0);
