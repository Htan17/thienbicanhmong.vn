# TKBC FULL WORKING V16 — khôi phục bản sử dụng

Bản này được tách riêng từ source Commercial REV7 theo yêu cầu. Bản Commercial gốc không bị sửa.

## Firebase đã cấu hình
- Project ID: `thienbicanhmong`
- Auth domain: `thienbicanhmong.firebaseapp.com`
- Storage bucket: `thienbicanhmong.firebasestorage.app`
- Functions region trong source: `asia-southeast1`
- Firebase Web config đặt tại `js/firebase-config.js`.
- `.firebaserc` trỏ mặc định tới `thienbicanhmong`.

## Trạng thái và giới hạn quan trọng
- Source Firebase client đã được cấu hình để kết nối project trên khi mở app bằng domain đã được Firebase cho phép.
- Ảnh Console xác nhận Authentication providers Email/Password, Google, Twitter, Anonymous đang Enabled; Firestore có dữ liệu.
- Ảnh Console cho thấy Cloud Functions chưa có deployment. Source `functions/` có sẵn nhưng chưa được deploy.
- Chưa chạy được build/test trong môi trường này vì chưa cài dependencies; chưa xác minh runtime thực tế với project Firebase.
- Không deploy `firestore.rules` hoặc `firestore.rules.hardened` tự động. Rules hardened yêu cầu chuyển các thao tác kinh tế sang Cloud Functions trước; deploy sớm có thể làm hỏng tính năng.
- Không chạy `firebase deploy` trước khi backup Firestore và kiểm thử Rules/Functions trên Emulator.

## Bước tiếp theo trên máy Windows
1. Cài Node.js 22.x.
2. Mở terminal tại thư mục này, chạy `npm install`.
3. Chạy `npm run test:all`, sau đó `npm run build`.
4. Cài dependencies Functions: `cd functions && npm install && cd ..`.
5. Trước khi deploy bất cứ thứ gì, export/backup Firestore và chạy Emulator + Rules tests.

## Lưu ý bảo mật
Firebase Web API key là cấu hình client, không phải service-account private key. Tuy nhiên cần giới hạn API key/domain trong Google Cloud Console. Không chia sẻ service account JSON, private key hoặc mật khẩu.
