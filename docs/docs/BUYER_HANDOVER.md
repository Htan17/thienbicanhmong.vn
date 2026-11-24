# Bàn giao cho người mua — tình trạng THẬT (đọc trước khi mua/bán)

## Sản phẩm là gì
Web app học ngoại ngữ/kiến thức game hoá (React + Firebase + Gemini BYOK): Bí Tịch (quiz) với Quiz Engine V2, học qua video, thẻ ôn SRS, Đạo Lộ luyện thi, Tông Môn, cửa hàng, bảng xếp hạng, báo cáo/kiểm duyệt, Research Dashboard.

## Giá trị đã có
- Nhiều tính năng đã viết sẵn trong source; test V11 (11) và test backend (23) chạy được offline.
- Backend Cloud Functions thật cho: quiz, video, SRS, mã quà, mua đồ, bùa, đột phá, đổi tên, tạo/rời Tông Môn, xoá tài khoản, chốt mùa, thống kê nghiên cứu (code đã viết, CHƯA chạy trên Firebase).
- Rules cứng hoá + bộ test rules (CHƯA chạy trên Emulator).

## Việc còn lại trước khi gọi là "an toàn để vận hành" (xem KNOWN_ISSUES.md)
1. Chạy `./build.sh`, sửa lỗi nếu có; deploy Functions lên project STAGING; thử tay mọi luồng đã nối.
2. Nối nốt các điểm ghi kinh tế còn lại (docs/CLIENT_WRITE_AUDIT.md) và các hàm Tông Môn chưa viết.
3. Chạy `npm run test:rules` trên Emulator; chỉ khi pass mới `npm run rules:activate-hardened` (cùng lúc với client mới).
4. Thu hồi toàn bộ mã quà cũ (đã lộ trong source V11), phát mã mới.
5. Sửa Auth (email nội bộ @thienkieu.com sau khi đổi email), migration dữ liệu cũ (friends/requests, guild theo UID).
6. Chấm quiz phía server nếu muốn chống gian lận thật (hiện chỉ có trần/ngày).

## Rủi ro người mua nên tự kiểm tra (không phải lời khuyên pháp lý)
- Quyền sở hữu: nội dung/ảnh/tên/biểu tượng, thư viện bên thứ ba, bộ đề do người dùng tạo; điều khoản & chính sách riêng tư (`dieu-khoan.html`) cần luật sư rà.
- Dữ liệu cá nhân người dùng thật (nếu chuyển nhượng database): quy định bảo vệ dữ liệu cá nhân.
- Gemini: người dùng tự nhập key (BYOK); tuân thủ điều khoản Google; key nằm ở trình duyệt/Firestore của chính họ, không phải bí mật phía server.
- Chưa có số liệu doanh thu/người dùng được kiểm chứng trong gói này; không nêu số liệu như vậy khi chào bán nếu không có bằng chứng.

## Chi phí vận hành cần biết
Cloud Functions cần gói Blaze; Firestore tính theo lượt đọc/ghi (bảng xếp hạng đọc cả collection `users` là điểm tốn kém khi số người dùng tăng).
