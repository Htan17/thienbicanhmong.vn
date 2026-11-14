# FEATURE_MATRIX (13/11/2026)
Chú thích — **Server**: có Cloud Function xử lý nghiệp vụ nhạy cảm. **Test**: có test tự động (U = unit logic thuần đã chạy; I = integration viết nhưng CHƯA chạy; R = rules test CHƯA chạy). **Trạng thái** chỉ nói code đã có và mức kiểm chứng; KHÔNG có mục nào được xác nhận chạy đúng trên Emulator/Production.

| Tính năng | Server | Test | Trạng thái |
|---|---|---|---|
| Đăng ký / đăng nhập (Đạo Hiệu, Google, email thật xác minh) | Auth + Rules | — | Có code; sửa gần đây chưa chạy thử |
| Đổi tên (`renameUser`) | Có | U, I(chưa) | Có code |
| Quiz + thưởng (`startQuiz`, `claimQuizReward`) | Có (không xác minh đáp án) | U | Thưởng bị giới hạn, `verified:false` |
| Nhập DOCX | Không (client) | U (parser) | Có code + unit test; xuất DOCX: CHƯA kiểm chứng |
| Tạo câu hỏi bằng Gemini | Không (BYOK client) | — | Có code; không có key server |
| SRS (`claimSrsReward`) | Có | U | Có code |
| Video học + ải ôn tập (`claimVideoReward`, `claimVideoQuizRound`) | Có | U, I(chưa) | Điểm ải do client khai |
| Cửa hàng / Túi đồ (`purchaseItem`, `buyRank`, `activateBuff`) | Có | U | Có code |
| Trang bị (`equipItem`) | Có | U, I(chưa), R(chưa) | Mới thêm |
| Gacha (`rollGacha`) | Có | U, I(chưa) | Mới chuyển lên server |
| Tông môn (tạo/gia nhập/rời/trục xuất/truyền ngôi/giải tán/nâng cấp/đặc quyền) | Có | U, I(chưa) | Mới chuyển lên server; dữ liệu cũ theo tên cần di trú |
| Kết bạn / lời mời | Rules (subcollection) | R(chưa) | Client mới đổi, cần script di trú, CHƯA chạy |
| Mùa giải / bảng xếp hạng | 3 hàm lịch | U | Cần Pub/Sub Emulator; client còn ghi `meta/*` |
| Chuỗi ngày (`restoreStreak`) | Có | U | Có code |
| Mã quà (`redeemGiftCode`) | Có | U | Có code |
| Đạo Lộ / thi cử | Hàm lịch + rules | U | Có code |
| Kiểm duyệt + nhật ký (`adminModerate`, `adminAudit`) | Có | U, I(chưa), R(chưa) | Mới thêm |
| Thống kê nghiên cứu (`getResearchStats`) | Có (admin) | — | Có code |
| Xoá tài khoản (`deleteAccount`) | Có | — | Có UI; chưa dọn bản ghi bạn bè đối xứng |
| Thông báo / Analytics / ALEP / nhiệm vụ ngày / thành tựu | — | — | CHƯA audit trong phiên này |
