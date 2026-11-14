# Triển khai (khi các mục trong KNOWN_ISSUES đã xong)
1. Sao lưu: `gcloud firestore export gs://<bucket>/backup-$(date +%F)` và lưu `firestore.rules` hiện tại.
2. Vô hiệu hoá GIFT_CODES cũ (đã lộ). Tạo mã mới: `node functions/scripts/seed-meta-and-gifts.js --gift MA 1000 0 100`.
3. `cd functions && npm install && npm test` ; `npm run test:rules` (cần Java + firebase-tools).
4. Deploy lên STAGING trước: `firebase use <staging> && firebase deploy --only functions`, seed meta, nối client, kiểm thử tay.
5. Chỉ khi client dùng callable hoàn toàn: đổi `firebase.json` → `firestore.rules.hardened` và deploy rules cùng lúc với client.
6. Rollback: deploy lại `firestore.rules` cũ (Console → Rules → History).
