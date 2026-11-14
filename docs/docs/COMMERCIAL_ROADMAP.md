# COMMERCIAL_ROADMAP (13/11/2026) — thứ tự ưu tiên; không có ước tính doanh thu/định giá
## P0 — trước khi vận hành cho người dùng thật
1. Chạy `npm ci` (tạo lockfile), `npm audit`, `npm run build` trên máy Windows; xử lý lỗi.
2. Chạy Emulator + `npm run test:rules` + `npm run test:integration`; sửa mọi test đỏ.
3. Xử lý các ghi từ client còn lệch rules (`meta/*`, dữ liệu Tông môn cũ theo tên), chạy script di trú (friends/requests, recoveryEmail), rồi kích hoạt rules hardened.
4. Thay/xác minh tài nguyên bên thứ ba (Pinterest GIF, Mixkit, DiceBear, font).
5. Quyết định hướng quiz: ngân hàng câu hỏi nền tảng ở server hoặc chấp nhận `verified:false` (ghi rõ cho người mua).
## P1 — trước khi mở bán rộng
Thay nghe toàn bộ `users`/`guilds` bằng truy vấn phân trang/bảng xếp hạng dựng ở server; tách `App.jsx`; lazy loading/code splitting; E2E + kiểm tra responsive/trợ năng; load test; App Check; khoá Gemini phía server với hạn mức (nếu muốn); giám sát/cảnh báo.
## P2 — sau đó
Phân tích dùng sản phẩm, thông báo, công cụ quản trị mở rộng, đa ngôn ngữ, quy trình phát hành CI/CD.
