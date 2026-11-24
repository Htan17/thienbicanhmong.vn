# Quyền sở hữu & phạm vi chuyển nhượng — BẢN NHÁP, CHƯA XÁC MINH
Không phải tư vấn pháp lý. Chủ dự án và người mua nên nhờ luật sư xác nhận trước khi giao dịch.
| Nhóm | Mô tả | Trạng thái |
|---|---|---|
| Mã do chủ dự án viết | `src/`, `functions/`, `tools/`, CSS | Chủ dự án tự xác nhận quyền chuyển nhượng |
| Mã có AI hỗ trợ | Phần lớn dự án (chủ dự án cho biết có dùng AI) | Quyền sở hữu đầu ra AI phụ thuộc điều khoản của công cụ AI đã dùng và luật từng nước — CHƯA kiểm chứng; ghi lại công cụ/điều khoản vào `AI_CONTRIBUTION_RECORD.md` (chưa tạo) |
| Thư viện mã nguồn mở | React, Firebase, esbuild, Tailwind, LZString, mammoth… (CDN/npm) | Giữ nguyên giấy phép gốc của từng thư viện; chưa lập bảng giấy phép (cần mạng + lockfile) |
| Tài nguyên bên thứ ba | Biểu tượng DiceBear (index/boot.js), font/CDN, ảnh, âm thanh | CHƯA kiểm kê; không khẳng định độc quyền |
| Dữ liệu người dùng thật | Firestore production của người bán | KHÔNG nằm trong gói; chuyển giao chỉ khi có căn cứ pháp lý về dữ liệu cá nhân |
| Thương hiệu/tên miền/GitHub Pages | `htan17.github.io/thienbicanhmong.vn` | Không chuyển theo gói; người mua tự đặt |
| Điều khoản phi thương mại | `dieu-khoan.html` (dòng ~28, 34) tuyên bố dự án "phi thương mại", cá nhân, chưa đăng ký; `README.md.v11` cũng ghi "phi thương mại". Mô tả `package.json` đã đổi | CHƯA sửa `dieu-khoan.html`/`README.md.v11` — người mua phải viết lại điều khoản và chính sách riêng tư theo pháp lý của mình |
Không có số liệu doanh thu/người dùng được kiểm chứng trong gói này; không nêu số liệu đó khi chào bán nếu không có bằng chứng.
