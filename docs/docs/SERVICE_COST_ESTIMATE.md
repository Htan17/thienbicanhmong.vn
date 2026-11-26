# SERVICE_COST_ESTIMATE (13/11/2026) — KHÔNG đưa số tiền
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
