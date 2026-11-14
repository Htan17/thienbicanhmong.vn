# Mức sẵn sàng thương mại và lộ trình
> Gộp từ: docs/commercial/READINESS_AND_ROADMAP.md, docs/commercial/READINESS_AND_ROADMAP.md, docs/commercial/READINESS_AND_ROADMAP.md (13/11/2026, sắp xếp lại thư mục).

## TECHNICAL_DUE_DILIGENCE (13/11/2026) — dành cho bên nhận chuyển nhượng
Trạng thái tổng: **NOT PRODUCTION READY**. Tài liệu này chỉ nêu dữ kiện đã đo/đã đọc; không có số liệu doanh thu, người dùng hay định giá.

### Quy mô
94 file JS/JSX (≈11.300 dòng; `docs/technical/STRUCTURE_REPORT.md`), 29 hàm server, `App.jsx` ≈4.750 dòng.

### Kiểm thử (13/11/2026)
- Unit (logic thuần): 151/151 đạt (root 11, frontend 91, functions 49).
- Integration (`tests/integration`, 10 test), Firestore Rules test, browser/E2E, responsive, load test: **CHƯA CHẠY**.
- Build: bundle trong gói là bản cũ; phải chạy `npm run build` (sandbox phát triển không có esbuild/Emulator).

### Rủi ro P0 còn lại
1. Rules hardened chưa kích hoạt/chưa test; client còn ghi chéo (đã sửa phần kết bạn/mời, chưa chạy thử); Tông môn cũ có thể lưu theo tên (xem `docs/technical/SECURITY_AUDIT.md`).
2. Quiz/ải video không thể xác minh đáp án ở server (đề do người dùng/AI tạo).
3. Chưa có `package-lock.json`; chưa chạy `npm audit` (số liệu V14: 27 cảnh báo frontend/1 critical, 8 moderate ở functions — chưa tái kiểm).
4. Tài nguyên bên thứ ba chưa xác minh quyền thương mại (Pinterest GIF, Mixkit, DiceBear, font): `docs/legal/LICENSE_AND_ASSETS.md`.
5. Gemini dùng khoá của người dùng (BYOK); nếu cần khoá server phải phát triển thêm.
6. Collection `users` đọc được bởi mọi người đã đăng nhập; client nghe toàn bộ → vấn đề riêng tư và chi phí khi tăng người dùng.

### Nợ kỹ thuật
`App.jsx` quá lớn; không lazy loading/code splitting; không E2E; tài liệu sinh tự động (API) chưa đối chiếu bằng gọi thật.

### Phụ thuộc người bán
Đã loại Project ID cũ khỏi cấu hình; còn chuỗi kiểm tra trong `tools/preflight.mjs` và URL GitHub Pages trong tài liệu/lịch sử (xem `docs/legal/LICENSE_AND_ASSETS.md`). Người mua dùng project Firebase riêng (`.firebaserc.example`).

## COMMERCIAL_READINESS_REPORT — V14 (12/11/2026)
### Kết luận
| Trạng thái | Kết quả |
|---|---|
| LOCAL_VERIFIED | **CHƯA ĐẠT.** Có: 134/134 test (root 11, frontend 90, functions 33), bundle biên dịch được và đồng bộ `src/`, check-globals sạch — trên Linux/Node 22. Thiếu: `npm ci`/lockfile, build trên Windows thật, Emulator, rules tests, chạy trình duyệt |
| BUYER_DEPLOYMENT_READY | **CHƯA ĐẠT.** Có cấu hình tách project + hướng dẫn; chưa chạy thử, rules hardened chưa test, còn 28 chỗ client ghi trực tiếp, thiếu App Check/Claims |
| PRODUCTION_VERIFIED | **KHÔNG** (không được yêu cầu, không có Billing) |
Dự án CHƯA đủ điều kiện chào bán ở mức 29.900.000 VNĐ theo tiêu chuẩn của master command; mức giá là mục tiêu kinh doanh, không phải kết quả kiểm chứng.

### Đã làm trong phiên này (có bằng chứng)
Build Windows-safe (`tools/build.mjs`), runner test, preflight; scripts package.json; Node 22 (Node 20 đã bị decommission 30/10/2026); cấu hình Emulator đầy đủ + seed; gỡ hardcode project người bán; nối `renameUser`/`createGuild`/`leaveGuild`; gỡ chốt mùa ở client; build lại bundle; tài liệu thật (audit, dependency, local dev, buyer guide, install, license nháp, work log, next tasks).
### File thay đổi chính
`package.json`, `functions/package.json`, `firebase.json`, `firebase.emulator-*.json`, `.nvmrc`, `.env.example`, `index.html`, `js/app.min.js` (build lại), `src/config/firebase.js`, `src/lib/serverApi.js`, `src/App.jsx`; mới: `tools/{build,run-tests,preflight,seed-emulator}.mjs`, `tests/fixtures/emulator-seed.json`, `firestore.indexes.json`, `.firebaserc.example`, `js/firebase-config.example.js`, các tài liệu trong `docs/`.
### Test thực tế (Linux, Node 22.23.4, không mạng)
`test` 11/11 · `test:frontend` 90/90 · `test:functions` 33/33 · `check:globals` OK · `build` + `build:check` PASS · `check` (preflight): 2 FAIL (thiếu 2 lockfile), 1 WARN (functions/node_modules).
### Chưa làm / còn tồn tại
Lockfile; npm audit (27 + 8 lỗ hổng theo máy người dùng, 1 critical, chưa phân loại); Emulator; rules tests; gacha, ải video, gia nhập/kick/chuyển bang chủ vẫn ghi từ client; quiz chưa chấm server; Auth (email giả), Custom Claims admin, App Check, rate limit, audit log admin; tách App.jsx; UI/UX; E2E; hiệu năng; demo/ảnh chụp; 13 tài liệu hồ sơ chuyển nhượng chưa viết.
### Người mua phải làm
Xem `docs/guides/DEPLOYMENT_AND_HANDOVER.md` (Billing Blaze, config project, đổi URL, rà pháp lý, thu hồi mã quà cũ, deploy theo thứ tự, smoke test). Rà `dieu-khoan.html` (còn tuyên bố phi thương mại).
### Giới hạn dịch vụ bên thứ ba
Gemini BYOK (key của người dùng, điều khoản Google); YouTube/CDN/DiceBear; Cloud Functions cần Blaze.
### Điều kiện chuyển nhượng
Chỉ chuyển phần chủ dự án có quyền (xem `docs/legal/LICENSE_AND_ASSETS.md`, bản nháp chưa xác minh); không gồm dữ liệu người dùng thật.

## COMMERCIAL_ROADMAP (13/11/2026) — thứ tự ưu tiên; không có ước tính doanh thu/định giá
### P0 — trước khi vận hành cho người dùng thật
1. Chạy `npm ci` (tạo lockfile), `npm audit`, `npm run build` trên máy Windows; xử lý lỗi.
2. Chạy Emulator + `npm run test:rules` + `npm run test:integration`; sửa mọi test đỏ.
3. Xử lý phần còn lệch rules (dữ liệu Tông môn cũ lưu theo tên), chạy script di trú (friends/requests, recoveryEmail), rồi kích hoạt rules hardened.
4. Thay/xác minh tài nguyên bên thứ ba (Pinterest GIF, Mixkit, DiceBear, font).
5. Quyết định hướng quiz: ngân hàng câu hỏi nền tảng ở server hoặc chấp nhận `verified:false` (ghi rõ cho người mua).
### P1 — trước khi mở bán rộng
Thay nghe toàn bộ `users`/`guilds` bằng truy vấn phân trang/bảng xếp hạng dựng ở server; tách `App.jsx`; lazy loading/code splitting; E2E + kiểm tra responsive/trợ năng; load test; App Check; khoá Gemini phía server với hạn mức (nếu muốn); giám sát/cảnh báo.
### P2 — sau đó
Phân tích dùng sản phẩm, thông báo, công cụ quản trị mở rộng, đa ngôn ngữ, quy trình phát hành CI/CD.
