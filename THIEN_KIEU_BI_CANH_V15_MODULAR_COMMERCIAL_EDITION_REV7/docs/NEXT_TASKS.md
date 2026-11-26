# NEXT_TASKS — V15.0.0-rc.0 (đối chiếu 14/11/2026)

Mục đã làm trong code nhưng chưa chạy được ghi là "code có, chưa kiểm chứng". Không có mục nào dưới đây được đánh dấu hoàn thành nếu chưa có bằng chứng chạy.

## P0 — cần máy có mạng
1. `npm install` ở thư mục gốc và `functions/` để tạo `package-lock.json` hai nơi, commit; sau đó dùng `npm ci`. Build lại bundle bằng `npm run build` với esbuild đúng pin; `npm run build:check`.
2. `npm audit` hai nơi (số liệu V14 cũ: 27 cảnh báo frontend gồm 1 critical, 8 moderate ở functions — chưa tái kiểm); cập nhật `docs/technical/SECURITY_AUDIT.md`. Không dùng `npm audit fix --force`.
3. `npm run emulators`, `npm run emulators:seed`, `npm run test:rules`, `npm run test:integration`; sửa mọi test đỏ; ghi kết quả vào `docs/technical/TEST_REPORT.md`. Test rules cần tắt Emulator trước.
4. Trên Windows: xác nhận Pub/Sub Emulator READY, 3 hàm lịch (`finalize*`) được nạp, project hiển thị `demo-tkbc`.

## P0 — chức năng và bảo mật
5. Chạy tay kết bạn / mời Tông môn (client đã đổi sang subcollection, chưa chạy thử); chạy `functions/scripts/migrate-friends-requests.js` dry-run trên Emulator.
6. Xử lý dữ liệu Tông môn cũ lưu theo tên (chưa có script di trú sang UID).
7. Rà 20 lời gọi `safeUserUpdate` + 1 `increment(` còn lại trong `src/App.jsx`.
8. Quyết định hướng chấm quiz (ngân hàng câu hỏi phía server hoặc chấp nhận `verified:false`); App Check; chạy thử Custom Claims admin (`grant-admin.js`) và Auth email khôi phục (code có, chưa kiểm chứng).
9. Chỉ khi 3, 5–7 xong: `npm run rules:activate-hardened` cùng lúc deploy client mới.

## P1 / P2
Tách `App.jsx` theo nghiệp vụ (xem `docs/technical/STRUCTURE_REPORT.md`); lazy loading; UI/UX và responsive; E2E/browser smoke; load test; thay/xác minh tài nguyên bên thứ ba; rà pháp lý `dieu-khoan.html`; viết `LICENSE` khi chủ sở hữu xác nhận.
Hạn Node: nâng Functions lên Node 24 trước 2027-04-30.
