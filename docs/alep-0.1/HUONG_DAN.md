# ALEP 0.1 – Đo lường mức nắm vững (CHƯA đổi lộ trình)

## Đã làm gì
- Ghi lại mỗi câu làm (đúng/sai, số lần sai, dùng gợi ý, xem giải thích AI, bó tay, thời gian) -> tính mastery, độ tin cậy, mức hiệu lực có tính quên, trạng thái.
- Thẻ "Mức nắm vững / Cảnh giới" hiện ở tab RADAR (Đạo Lộ) ngay dưới biểu đồ Radar, có nút "Vì sao hệ thống đánh giá như vậy?".
- KHÔNG đổi thưởng, Đạo Lộ, Quiz, SRS, Radar, Firestore Rules, cấu trúc Firestore, Cloud Functions, package.json.

## Lưu ý trung thực
- Dữ liệu lưu trong localStorage của trình duyệt (khoá HS-xxxxxx), KHÔNG ghi Firestore -> chưa phải dữ liệu nghiên cứu chính thức; đổi máy/xoá dữ liệu trình duyệt là mất.
- Câu hỏi hiện chưa có chủ đề/độ khó riêng: chủ đề lấy từ Ải (nếu Ải có đúng 1 chủ đề thật), còn lại xếp "Chưa phân loại"; độ khó mặc định 2.
- Hằng số (hệ số điểm, tốc độ quên...) nằm ở src/adaptive/adaptiveConfig.js, cần hiệu chỉnh bằng dữ liệu thật.
- Thẻ chỉ hiện khi tab RADAR có dữ liệu (đã hoàn thành ít nhất 1 Ải).

## Cách đưa lên (không tự động deploy/push)
Thay thư mục docs/ của repo bằng docs/ trong zip rồi tự push như thường lệ.

## Kiểm thử
- `node --test src/adaptive/adaptiveEngine.test.js` (25 test) trong thư mục docs/.
- Thủ công: làm 1 Ải -> mở tab RADAR -> thấy thẻ; mở F12 > Application > Local Storage có khoá alep01:HS-...; thưởng/mở khoá Ải y như cũ.

## Rollback
Chép `backup_truoc_ALEP/App.jsx` về docs/src/App.jsx và `app.min.js` về docs/js/app.min.js (hoặc `patch -R -p1 < App.jsx.patch` rồi build lại). Xoá khoá localStorage `alep01:*` nếu muốn xoá dữ liệu thử.

## Vị trí sửa trong App.jsx (chỉ THÊM dòng, 0 dòng xoá)
3 dòng import; 1 dòng khởi tạo alepRef; startFreshQuiz, finalizeAnswer, handleGiveUpQuestion, handleRequestAiHint, handleAiExplainQuestion, continueAfterAnswer (nhánh câu tiếp + trước khối lưu câu cuối): mỗi nơi 1 dòng gọi; 1 dòng <MasteryCard> dưới <RadarChart>. Chi tiết xem App.jsx.patch.
