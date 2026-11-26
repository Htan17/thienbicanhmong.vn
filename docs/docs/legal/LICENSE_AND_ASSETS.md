# Bản quyền, tài sản bên thứ ba và đóng góp của AI
> Tài liệu này là bản gộp từ nhiều file nhỏ (gộp ngày 13/11/2026). Nguồn gốc từng phần được ghi ở tiêu đề mục (vd. `## PRODUCT_OVERVIEW (13/11/2026)`). Các file nhỏ gốc còn nguyên trong ZIP gốc `THIEN_KIEU_BI_CANH_V15_COMMERCIAL_SOURCE.zip`.

## Quyền sở hữu & phạm vi chuyển nhượng — BẢN NHÁP, CHƯA XÁC MINH
Không phải tư vấn pháp lý. Chủ dự án và người mua nên nhờ luật sư xác nhận trước khi giao dịch.
| Nhóm | Mô tả | Trạng thái |
|---|---|---|
| Mã do chủ dự án viết | `src/`, `functions/`, `tools/`, CSS | Chủ dự án tự xác nhận quyền chuyển nhượng |
| Mã có AI hỗ trợ | Phần lớn dự án (chủ dự án cho biết có dùng AI) | Quyền sở hữu đầu ra AI phụ thuộc điều khoản của công cụ AI đã dùng và luật từng nước — CHƯA kiểm chứng; ghi lại công cụ/điều khoản vào `docs/legal/LICENSE_AND_ASSETS.md` (chưa tạo) |
| Thư viện mã nguồn mở | React, Firebase, esbuild, Tailwind, LZString, mammoth… (CDN/npm) | Giữ nguyên giấy phép gốc của từng thư viện; chưa lập bảng giấy phép (cần mạng + lockfile) |
| Tài nguyên bên thứ ba | Biểu tượng DiceBear (index/boot.js), font/CDN, ảnh, âm thanh | CHƯA kiểm kê; không khẳng định độc quyền |
| Dữ liệu người dùng thật | Firestore production của người bán | KHÔNG nằm trong gói; chuyển giao chỉ khi có căn cứ pháp lý về dữ liệu cá nhân |
| Thương hiệu/tên miền/GitHub Pages | `htan17.github.io/thienbicanhmong.vn` | Không chuyển theo gói; người mua tự đặt |
| Điều khoản phi thương mại | `dieu-khoan.html` (dòng ~28, 34) tuyên bố dự án "phi thương mại", cá nhân, chưa đăng ký; `docs/archive/README_V11.md` cũng ghi "phi thương mại". Mô tả `package.json` đã đổi | CHƯA sửa `dieu-khoan.html`/`docs/archive/README_V11.md` — người mua phải viết lại điều khoản và chính sách riêng tư theo pháp lý của mình |
Không có số liệu doanh thu/người dùng được kiểm chứng trong gói này; không nêu số liệu đó khi chào bán nếu không có bằng chứng.

## THIRD_PARTY_ASSETS (kết quả quét source 12/11/2026 — QUYỀN THƯƠNG MẠI CHƯA XÁC MINH)
| Tài sản | Nguồn trong code | Trạng thái |
|---|---|---|
| GIF nền | i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif (3 chỗ) | Pinterest: chưa rõ chủ sở hữu/license. RỦI RO CAO. Thay bằng tài nguyên có license rõ |
| SFX Mixkit | mixkit.co/sfx/preview/*.mp3 (5 file: quick-jump-kick, magical-coin-win, magic-sweep-game-trophy, wrong-answer-fail, losing-bleeps, correct-answer-reward) | Hotlink file preview; cần đọc Mixkit License hiện hành, nên tải bản chính thức hoặc thay |
| Nhạc nền | mixkit.co/music/preview/mixkit-happy-love-song-493.mp3 | Như trên; cần kiểm tra điều khoản nhạc |
| Avatar | api.dicebear.com/7.x (adventurer-neutral, identicon) | Dịch vụ ngoài; kiểm tra license của style và phụ thuộc runtime |
| Font | Google Fonts (Montserrat, Playfair Display, Noto Sans...) | Thường là OFL; cần xác nhận từng font và nên self-host |
| Thư viện CDN | cdn.tailwindcss.com, cdnjs, jsdelivr, unpkg | Cần kiểm kê license từng gói; Tailwind CDN không nên dùng cho production |
Nhạc AI: không tìm thấy file trong source; nếu có nguồn ngoài repo, chủ dự án phải cung cấp điều khoản của công cụ tạo nhạc.

## AI_CONTRIBUTION_RECORD
Theo chủ dự án: một người phát triển chính từ 04/2026, có dùng AI hỗ trợ lập trình. Source không có .git nên KHÔNG có lịch sử commit để phân tách phần AI/phần người. Cần chủ dự án bổ sung: công cụ AI đã dùng, điều khoản của từng công cụ, phần nào do AI viết. Không khẳng định quyền sở hữu khi chưa có chứng cứ.
