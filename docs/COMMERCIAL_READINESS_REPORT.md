# COMMERCIAL_READINESS_REPORT — V14 (12/11/2026)
## Kết luận
| Trạng thái | Kết quả |
|---|---|
| LOCAL_VERIFIED | **CHƯA ĐẠT.** Có: 134/134 test (root 11, frontend 90, functions 33), bundle biên dịch được và đồng bộ `src/`, check-globals sạch — trên Linux/Node 22. Thiếu: `npm ci`/lockfile, build trên Windows thật, Emulator, rules tests, chạy trình duyệt |
| BUYER_DEPLOYMENT_READY | **CHƯA ĐẠT.** Có cấu hình tách project + hướng dẫn; chưa chạy thử, rules hardened chưa test, còn 28 chỗ client ghi trực tiếp, thiếu App Check/Claims |
| PRODUCTION_VERIFIED | **KHÔNG** (không được yêu cầu, không có Billing) |
Dự án CHƯA đủ điều kiện chào bán ở mức 29.900.000 VNĐ theo tiêu chuẩn của master command; mức giá là mục tiêu kinh doanh, không phải kết quả kiểm chứng.

## Đã làm trong phiên này (có bằng chứng)
Build Windows-safe (`tools/build.mjs`), runner test, preflight; scripts package.json; Node 22 (Node 20 đã bị decommission 30/10/2026); cấu hình Emulator đầy đủ + seed; gỡ hardcode project người bán; nối `renameUser`/`createGuild`/`leaveGuild`; gỡ chốt mùa ở client; build lại bundle; tài liệu thật (audit, dependency, local dev, buyer guide, install, license nháp, work log, next tasks).
## File thay đổi chính
`package.json`, `functions/package.json`, `firebase.json`, `firebase.emulator-*.json`, `.nvmrc`, `.env.example`, `index.html`, `js/app.min.js` (build lại), `src/config/firebase.js`, `src/lib/serverApi.js`, `src/App.jsx`; mới: `tools/{build,run-tests,preflight,seed-emulator}.mjs`, `tests/fixtures/emulator-seed.json`, `firestore.indexes.json`, `.firebaserc.example`, `js/firebase-config.example.js`, các tài liệu trong `docs/`.
## Test thực tế (Linux, Node 22.23.4, không mạng)
`test` 11/11 · `test:frontend` 90/90 · `test:functions` 33/33 · `check:globals` OK · `build` + `build:check` PASS · `check` (preflight): 2 FAIL (thiếu 2 lockfile), 1 WARN (functions/node_modules).
## Chưa làm / còn tồn tại
Lockfile; npm audit (27 + 8 lỗ hổng theo máy người dùng, 1 critical, chưa phân loại); Emulator; rules tests; gacha, ải video, gia nhập/kick/chuyển bang chủ vẫn ghi từ client; quiz chưa chấm server; Auth (email giả), Custom Claims admin, App Check, rate limit, audit log admin; tách App.jsx; UI/UX; E2E; hiệu năng; demo/ảnh chụp; 13 tài liệu hồ sơ chuyển nhượng chưa viết.
## Người mua phải làm
Xem `docs/FIREBASE_BUYER_DEPLOYMENT_GUIDE.md` (Billing Blaze, config project, đổi URL, rà pháp lý, thu hồi mã quà cũ, deploy theo thứ tự, smoke test). Rà `dieu-khoan.html` (còn tuyên bố phi thương mại).
## Giới hạn dịch vụ bên thứ ba
Gemini BYOK (key của người dùng, điều khoản Google); YouTube/CDN/DiceBear; Cloud Functions cần Blaze.
## Điều kiện chuyển nhượng
Chỉ chuyển phần chủ dự án có quyền (xem `docs/LICENSE_AND_OWNERSHIP.md`, bản nháp chưa xác minh); không gồm dữ liệu người dùng thật.
