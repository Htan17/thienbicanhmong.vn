# Hiệu năng và chi phí dịch vụ
> Tài liệu này là bản gộp từ nhiều file nhỏ (gộp ngày 13/11/2026). Nguồn gốc từng phần được ghi ở tiêu đề mục (vd. `## PRODUCT_OVERVIEW (13/11/2026)`). Các file nhỏ gốc còn nguyên trong ZIP gốc `THIEN_KIEU_BI_CANH_V15_COMMERCIAL_SOURCE.zip`.

## PERFORMANCE_REPORT (13/11/2026) — KHÔNG có load test; chỉ có số đo tĩnh
### Đã đo
- `js/app.min.js`: 489.117 byte (≈131 KB gzip) — bản build CŨ trong gói, chưa build lại sau các sửa gần đây.
- 0 lệnh `import()` động; một bundle duy nhất (không lazy loading/code splitting).
- Hàm lịch: `finalizeSeason` mỗi 5 phút (≈8.640 lần gọi/tháng), `finalizeExamPathDaily` mỗi 10 phút (≈4.320), `finalizeGuildSeason` mỗi 30 phút (≈1.440): tổng ≈14.400 lần/tháng kể cả khi không có người dùng (số học từ lịch trong code).
### Điểm nghẽn mở rộng (từ đọc code, chưa đo)
- Client mở `onSnapshot` trên **toàn bộ** `users` và `guilds`: mỗi thay đổi một hồ sơ bị gửi tới mọi client đang mở → số lần đọc tăng theo (số người dùng × số client online × tần suất thay đổi). Cần thay bằng truy vấn phân trang/bảng xếp hạng tổng hợp do server dựng.
- `App.jsx` 4.750 dòng: render lớn, chưa kiểm tra re-render.
### Chưa làm
Load test, đo Firestore reads/writes thực tế, đo bộ nhớ Functions, chỉ mục (`firestore.indexes.json` chưa đối chiếu với truy vấn). **Không tuyên bố số người dùng hỗ trợ.** Kế hoạch: dựng Emulator/dự án thử, mô phỏng N client bằng script, ghi số đọc/ghi và độ trễ, rồi mới kết luận.

## SERVICE_COST_ESTIMATE (13/11/2026) — KHÔNG đưa số tiền
Giá dịch vụ đám mây thay đổi; tài liệu này chỉ liệt kê **yếu tố phát sinh chi phí** và cách ước tính khi đã có số đo. Dùng trang giá chính thức của Firebase/Google Cloud và trình tính giá của họ.
| Dịch vụ | Yếu tố chi phí trong dự án |
|---|---|
| Firestore | số lần đọc/ghi/xoá, dung lượng; **nghe toàn bộ `users`/`guilds` ở mọi client làm số lần đọc tăng mạnh** (xem PERFORMANCE_REPORT) |
| Cloud Functions | số lần gọi + thời gian + bộ nhớ; 3 hàm lịch ≈14.400 lần/tháng cố định; yêu cầu gói Blaze |
| Authentication | số người dùng hoạt động hằng tháng (kiểm tra bậc miễn phí hiện hành) |
| Hosting | dung lượng lưu trữ và băng thông |
| Pub/Sub, Cloud Scheduler | phát sinh từ hàm lịch |
| Gemini | hiện do **người dùng trả bằng khoá của họ**; nếu chuyển sang khoá server, cần ngân sách + hạn mức theo người dùng |
| Tên miền, email gửi (xác minh/khôi phục) | Firebase gửi thư xác thực mặc định; thư tuỳ biến cần dịch vụ riêng |
Cách ước tính: đo số đọc/ghi và lần gọi Functions trên môi trường thử với N người dùng giả lập → nhân theo bảng giá hiện hành. Chưa có số đo nào.
