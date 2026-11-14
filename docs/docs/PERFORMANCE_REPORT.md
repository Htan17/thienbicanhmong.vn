# PERFORMANCE_REPORT (13/11/2026) — KHÔNG có load test; chỉ có số đo tĩnh
## Đã đo
- `js/app.min.js`: 489.117 byte (≈131 KB gzip) — bản build CŨ trong gói, chưa build lại sau các sửa gần đây.
- 0 lệnh `import()` động; một bundle duy nhất (không lazy loading/code splitting).
- Hàm lịch: `finalizeSeason` mỗi 5 phút (≈8.640 lần gọi/tháng), `finalizeExamPathDaily` mỗi 10 phút (≈4.320), `finalizeGuildSeason` mỗi 30 phút (≈1.440): tổng ≈14.400 lần/tháng kể cả khi không có người dùng (số học từ lịch trong code).
## Điểm nghẽn mở rộng (từ đọc code, chưa đo)
- Client mở `onSnapshot` trên **toàn bộ** `users` và `guilds`: mỗi thay đổi một hồ sơ bị gửi tới mọi client đang mở → số lần đọc tăng theo (số người dùng × số client online × tần suất thay đổi). Cần thay bằng truy vấn phân trang/bảng xếp hạng tổng hợp do server dựng.
- `App.jsx` 4.750 dòng: render lớn, chưa kiểm tra re-render.
## Chưa làm
Load test, đo Firestore reads/writes thực tế, đo bộ nhớ Functions, chỉ mục (`firestore.indexes.json` chưa đối chiếu với truy vấn). **Không tuyên bố số người dùng hỗ trợ.** Kế hoạch: dựng Emulator/dự án thử, mô phỏng N client bằng script, ghi số đọc/ghi và độ trễ, rồi mới kết luận.
