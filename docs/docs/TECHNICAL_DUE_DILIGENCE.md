# TECHNICAL_DUE_DILIGENCE (13/11/2026) — dành cho bên nhận chuyển nhượng
Trạng thái tổng: **NOT PRODUCTION READY**. Tài liệu này chỉ nêu dữ kiện đã đo/đã đọc; không có số liệu doanh thu, người dùng hay định giá.

## Quy mô
94 file JS/JSX (≈11.300 dòng; `docs/STRUCTURE_REPORT.md`), 29 hàm server, `App.jsx` ≈4.750 dòng.

## Kiểm thử (13/11/2026)
- Unit (logic thuần): 151/151 đạt (root 11, frontend 91, functions 49).
- Integration (`tests/integration`, 10 test), Firestore Rules test, browser/E2E, responsive, load test: **CHƯA CHẠY**.
- Build: bundle trong gói là bản cũ; phải chạy `npm run build` (sandbox phát triển không có esbuild/Emulator).

## Rủi ro P0 còn lại
1. Rules hardened chưa kích hoạt/chưa test; client còn ghi chéo/tự ghi `meta/*`; Tông môn cũ có thể lưu theo tên (xem `RULES_AUDIT_REPORT.md`).
2. Quiz/ải video không thể xác minh đáp án ở server (đề do người dùng/AI tạo).
3. Chưa có `package-lock.json`; chưa chạy `npm audit` (số liệu V14: 27 cảnh báo frontend/1 critical, 8 moderate ở functions — chưa tái kiểm).
4. Tài nguyên bên thứ ba chưa xác minh quyền thương mại (Pinterest GIF, Mixkit, DiceBear, font): `THIRD_PARTY_ASSETS.md`.
5. Gemini dùng khoá của người dùng (BYOK); nếu cần khoá server phải phát triển thêm.
6. Collection `users` đọc được bởi mọi người đã đăng nhập; client nghe toàn bộ → vấn đề riêng tư và chi phí khi tăng người dùng.

## Nợ kỹ thuật
`App.jsx` quá lớn; không lazy loading/code splitting; không E2E; tài liệu sinh tự động (API) chưa đối chiếu bằng gọi thật.

## Phụ thuộc người bán
Đã loại Project ID cũ khỏi cấu hình; còn chuỗi kiểm tra trong `tools/preflight.mjs` và URL GitHub Pages trong tài liệu/lịch sử (xem `docs/LICENSE_AND_OWNERSHIP.md`). Người mua dùng project Firebase riêng (`.firebaserc.example`).
