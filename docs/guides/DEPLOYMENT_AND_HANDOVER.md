# Triển khai, bàn giao và sao lưu
> Tài liệu này là bản gộp từ nhiều file nhỏ (gộp ngày 13/11/2026). Nguồn gốc từng phần được ghi ở tiêu đề mục (vd. `## PRODUCT_OVERVIEW (13/11/2026)`). Các file nhỏ gốc còn nguyên trong ZIP gốc `THIEN_KIEU_BI_CANH_V15_COMMERCIAL_SOURCE.zip`.

## Triển khai (khi các mục trong KNOWN_ISSUES đã xong)
1. Sao lưu: `gcloud firestore export gs://<bucket>/backup-$(date +%F)` và lưu `firestore.rules` hiện tại.
2. Vô hiệu hoá GIFT_CODES cũ (đã lộ). Tạo mã mới: `node functions/scripts/seed-meta-and-gifts.js --gift MA 1000 0 100`.
3. `cd functions && npm install && npm test` ; `npm run test:rules` (cần Java + firebase-tools).
4. Deploy lên STAGING trước: `firebase use <staging> && firebase deploy --only functions`, seed meta, nối client, kiểm thử tay.
5. Chỉ khi client dùng callable hoàn toàn: đổi `firebase.json` → `firestore.rules.hardened` và deploy rules cùng lúc với client.
6. Rollback: deploy lại `firestore.rules` cũ (Console → Rules → History).

## Hướng dẫn người mua: triển khai lên Firebase project CỦA BẠN
**Trạng thái gói: BUYER_DEPLOYMENT_READY = CHƯA.** Các bước dưới đây là quy trình đề xuất, CHƯA được chạy thử trên project thật. Làm xong và kiểm tra từng mục thì mới được coi là PRODUCTION_VERIFIED. Đọc `docs/technical/KNOWN_ISSUES.md` và `docs/technical/SECURITY_AUDIT.md` trước: còn 20 lời gọi `safeUserUpdate` trong `src/App.jsx` (đo 14/11/2026), rules hardened chưa test.
Bạn tự chịu Billing; người bán không chuyển tài khoản cá nhân nào. Cloud Functions bắt buộc gói **Blaze**.

1. **Tạo project**: console.firebase.google.com → Add project → ghi lại Project ID.
2. **Billing**: nâng cấp Blaze, đặt ngân sách/cảnh báo chi phí (xem `docs/guides/DEPLOYMENT_AND_HANDOVER.md` về điểm tốn kém: bảng xếp hạng đọc nhiều).
3. **Bật dịch vụ**: Authentication (Email/Password), Firestore (Native mode, chọn region), Cloud Functions, Cloud Scheduler, Cloud Build, Artifact Registry, Eventarc/Pub/Sub (Console sẽ nhắc API cần bật khi deploy).
4. **Web App**: Project settings → Your apps → Web → sao chép config.
5. **Cấu hình client**: `Copy-Item js\firebase-config.example.js js\firebase-config.js` rồi điền config (apiKey, authDomain, projectId...). Region Functions mặc định `asia-southeast1` (đổi đồng thời ở `src/config/functionsConfig.js` và `functions/lib/config.js`, rồi `npm run test:functions` để xác nhận hai nơi trùng nhau).
6. **Liên kết CLI**: `npm i -g firebase-tools` (hoặc dùng bản trong devDependencies) → `firebase login` → `Copy-Item .firebaserc.example .firebaserc`, sửa project ID, hoặc `firebase use --add`.
7. **Cài & kiểm tra** (Node 22; gói này CHƯA có lockfile nên lần đầu dùng `npm install` thay cho `npm ci`, rồi commit lockfile mà npm tạo ra): `npm ci ; Push-Location functions ; npm ci ; Pop-Location ; npm run check ; npm run test:all ; npm run build`.
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

### Ba trạng thái — không được đánh đồng
- LOCAL_VERIFIED: đã build + kiểm thử trên máy (gói này mới đạt phần unit test + biên dịch).
- BUYER_DEPLOYMENT_READY: làm theo tài liệu là chuyển được sang project mới.
- PRODUCTION_VERIFIED: đã deploy và kiểm thử Production thật.

## Bàn giao cho người mua — tình trạng THẬT (đọc trước khi mua/bán)

### Sản phẩm là gì
Web app học ngoại ngữ/kiến thức game hoá (React + Firebase + Gemini BYOK): Bí Tịch (quiz) với Quiz Engine V2, học qua video, thẻ ôn SRS, Đạo Lộ luyện thi, Tông Môn, cửa hàng, bảng xếp hạng, báo cáo/kiểm duyệt, Research Dashboard.

### Giá trị đã có
- Nhiều tính năng đã viết sẵn trong source; unit test chạy được offline (chạy lại 14/11/2026: root 11, frontend 91, functions 50 — tất cả đạt).
- Backend Cloud Functions thật cho: quiz, video, SRS, mã quà, mua đồ, bùa, đột phá, đổi tên, tạo/rời Tông Môn, xoá tài khoản, chốt mùa, thống kê nghiên cứu; bản rc.0 bổ sung gacha, gia nhập/trục xuất/truyền ngôi/giải tán Tông Môn, nâng cấp/đặc quyền/đổi EXP, khôi phục chuỗi, trang bị, ải video, kiểm duyệt admin — tổng 28 hàm, xem `docs/technical/API_DOCUMENTATION.md` (code đã viết, CHƯA chạy trên Firebase).
- Rules cứng hoá + bộ test rules (CHƯA chạy trên Emulator).

### Việc còn lại trước khi gọi là "an toàn để vận hành" (xem docs/technical/KNOWN_ISSUES.md)
1. Chạy `npm run build` rồi `npm run build:check` (bản trong gói được build bằng esbuild 0.28.2, khác bản pin `^0.25.0`: nên build lại sau khi có lockfile); deploy Functions lên project STAGING; thử tay mọi luồng đã nối.
2. Rà nốt các điểm client còn ghi trực tiếp (20 lời gọi `safeUserUpdate` trong `src/App.jsx`, đo 14/11/2026; xem `docs/technical/KNOWN_ISSUES.md`, `docs/technical/SECURITY_AUDIT.md`).
3. Chạy `npm run test:rules` trên Emulator; chỉ khi pass mới `npm run rules:activate-hardened` (cùng lúc với client mới).
4. Thu hồi toàn bộ mã quà cũ (đã lộ trong source V11), phát mã mới.
5. Chạy thử Auth (phần sửa email khôi phục đã có trong code nhưng CHƯA kiểm chứng; vấn đề cũ: email nội bộ @thienkieu.com sau khi đổi email), migration dữ liệu cũ (friends/requests, guild theo UID).
6. Chấm quiz phía server nếu muốn chống gian lận thật (hiện chỉ có trần/ngày).

### Rủi ro người mua nên tự kiểm tra (không phải lời khuyên pháp lý)
- Quyền sở hữu: nội dung/ảnh/tên/biểu tượng, thư viện bên thứ ba, bộ đề do người dùng tạo; điều khoản & chính sách riêng tư (`dieu-khoan.html`) cần luật sư rà.
- Dữ liệu cá nhân người dùng thật (nếu chuyển nhượng database): quy định bảo vệ dữ liệu cá nhân.
- Gemini: người dùng tự nhập key (BYOK); tuân thủ điều khoản Google; key nằm ở trình duyệt/Firestore của chính họ, không phải bí mật phía server.
- Chưa có số liệu doanh thu/người dùng được kiểm chứng trong gói này; không nêu số liệu như vậy khi chào bán nếu không có bằng chứng.

### Chi phí vận hành cần biết
Cloud Functions cần gói Blaze; Firestore tính theo lượt đọc/ghi (bảng xếp hạng đọc cả collection `users` là điểm tốn kém khi số người dùng tăng).

## BACKUP_RESTORE (13/11/2026) — lệnh tham khảo, CHƯA chạy thử; đối chiếu tài liệu Google Cloud hiện hành trước khi dùng
Yêu cầu: gói Blaze, `gcloud`/`firebase-tools` đã đăng nhập đúng tài khoản người mua, một Cloud Storage bucket.
### Firestore
- Xuất: `gcloud firestore export gs://<BUCKET>/backups/<NGÀY> --project=<PROJECT_ID>`
- Nhập (khôi phục): `gcloud firestore import gs://<BUCKET>/backups/<NGÀY>/<THƯ_MỤC_EXPORT> --project=<PROJECT_ID>` (ghi đè tài liệu cùng ID; nên thử trên project phụ trước)
- Lịch sao lưu tự động: `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d --project=<PROJECT_ID>`
- Khôi phục về thời điểm (nếu bật PITR): xem tài liệu "Point-in-time recovery" của Firestore.
### Authentication
- `firebase auth:export users.json --project <PROJECT_ID>`; nhập: `firebase auth:import users.json --hash-algo=... --project <PROJECT_ID>` (cần tham số băm của project nguồn để giữ mật khẩu).
### Cấu hình/mã
Mã, rules, indexes nằm trong repo (`firebase.json`, `firestore.rules`, `firestore.indexes.json`). Khoá dịch vụ **không** để trong repo.
### Kiểm tra sau khôi phục
Đăng nhập thử; kiểm tra số `users`, `guilds`; kiểm tra bảng `ledger`/`serverState` còn nhất quán; chạy `node tools/preflight.mjs`.
