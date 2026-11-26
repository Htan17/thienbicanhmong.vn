# Hướng dẫn người mua: triển khai lên Firebase project CỦA BẠN
**Trạng thái gói: BUYER_DEPLOYMENT_READY = CHƯA.** Các bước dưới đây là quy trình đề xuất, CHƯA được chạy thử trên project thật. Làm xong và kiểm tra từng mục thì mới được coi là PRODUCTION_VERIFIED. Đọc `docs/KNOWN_ISSUES.md` và `FULL_SYSTEM_AUDIT.md` trước: còn 28 chỗ client ghi trực tiếp, rules hardened chưa test.
Bạn tự chịu Billing; người bán không chuyển tài khoản cá nhân nào. Cloud Functions bắt buộc gói **Blaze**.

1. **Tạo project**: console.firebase.google.com → Add project → ghi lại Project ID.
2. **Billing**: nâng cấp Blaze, đặt ngân sách/cảnh báo chi phí (xem `docs/BUYER_HANDOVER.md` về điểm tốn kém: bảng xếp hạng đọc nhiều).
3. **Bật dịch vụ**: Authentication (Email/Password), Firestore (Native mode, chọn region), Cloud Functions, Cloud Scheduler, Cloud Build, Artifact Registry, Eventarc/Pub/Sub (Console sẽ nhắc API cần bật khi deploy).
4. **Web App**: Project settings → Your apps → Web → sao chép config.
5. **Cấu hình client**: `Copy-Item js\firebase-config.example.js js\firebase-config.js` rồi điền config (apiKey, authDomain, projectId...). Region Functions mặc định `asia-southeast1` (đổi đồng thời ở `src/config/functionsConfig.js` và `functions/lib/config.js`, rồi `npm run test:functions` để xác nhận hai nơi trùng nhau).
6. **Liên kết CLI**: `npm i -g firebase-tools` (hoặc dùng bản trong devDependencies) → `firebase login` → `Copy-Item .firebaserc.example .firebaserc`, sửa project ID, hoặc `firebase use --add`.
7. **Cài & kiểm tra** (Node 22): `npm ci ; Push-Location functions ; npm ci ; Pop-Location ; npm run check ; npm run test:all ; npm run build`.
8. **Kiểm thử Rules trên Emulator trước**: `npm run test:rules`. Chỉ khi PASS: `npm run rules:activate-hardened`.
9. **Secrets**: source hiện không dùng Secret Manager; Gemini là BYOK (người dùng tự nhập). Nếu bạn thêm khoá phía server, dùng `firebase functions:secrets:set TEN_KHOA`.
10. **Mã quà**: mã cũ của người bán đã lộ trong bản V11 — coi là vô hiệu. Tạo mã mới: đặt `GOOGLE_APPLICATION_CREDENTIALS` trỏ tới service account CỦA BẠN (không commit), `node functions/scripts/seed-meta-and-gifts.js --gift MA 1000 0 100`, và seed `meta/season`, `meta/guildSeason`, `meta/examPathDaily` theo script.
11. **App Check**: Console → App Check → đăng ký Web (reCAPTCHA Enterprise/v3) → bật Enforce sau khi client gửi token. **CHƯA tích hợp trong source** — việc cần làm.
12. **Triển khai (STAGING trước nếu được)**:
```powershell
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
npm run build ; firebase deploy --only hosting
```
Hosting phục vụ thư mục gốc có danh sách `ignore` (xem `firebase.json`) — kiểm tra bằng `firebase hosting:channel:deploy preview` trước khi lên kênh live.
13. **Smoke test thủ công**: đăng ký → đăng nhập → học video → SRS → quiz → nhận thưởng → shop → tu luyện → Tông môn → bảng xếp hạng. Ghi kết quả vào TEST_REPORT.
14. **Logs**: `firebase functions:log` hoặc Cloud Logging; kiểm tra lỗi `permission-denied` (rules) và `failed-precondition`.
15. **Việc bạn phải làm thêm**: thay URL GitHub Pages của người bán trong `index.html` (canonical/og:url/JSON-LD) và `dieu-khoan.html`; nhờ luật sư rà điều khoản/chính sách riêng tư; thay tên miền/OAuth domain trong Authentication.

## Ba trạng thái — không được đánh đồng
- LOCAL_VERIFIED: đã build + kiểm thử trên máy (gói này mới đạt phần unit test + biên dịch).
- BUYER_DEPLOYMENT_READY: làm theo tài liệu là chuyển được sang project mới.
- PRODUCTION_VERIFIED: đã deploy và kiểm thử Production thật.
