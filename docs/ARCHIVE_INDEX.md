# ARCHIVE_INDEX — tài liệu đã lưu trữ

Các file dưới `docs/archive/` chỉ để tra cứu lịch sử; **không** mô tả trạng thái V15.0.0-rc.0. 5 tài liệu ở gốc `archive/` đã được thêm banner "ĐÃ LƯU TRỮ" ở đầu (nội dung gốc giữ nguyên sau banner); các file trong `archive/addons/` giữ nguyên từng byte. Không có file nào bị xoá.

| File | Phiên bản | Nội dung | Lý do lưu trữ | Tài liệu hiện hành thay thế |
|---|---|---|---|---|
| `archive/README_V11.md` | V11 | README đầy đủ của V11 (mô tả, cài đặt đơn file, lịch sử vá) | Có tuyên bố "phi thương mại" và đường dẫn/quy trình cũ, mâu thuẫn với bản thương mại | `README.md`, `docs/README.md` |
| `archive/FINAL_REPORT_V13.md` | V13 | Báo cáo trạng thái V13 (WIP), bảng đã viết/đã chạy | Số liệu test và trạng thái đã cũ | `docs/PROJECT_STATUS.md`, `technical/KNOWN_ISSUES.md` |
| `archive/FULL_SYSTEM_AUDIT_V14.md` | V14 (12/11/2026) | Đối chiếu báo cáo cũ với source, số liệu 134/134 | Ảnh chụp một thời điểm; có giá trị lịch sử | `docs/PROJECT_STATUS.md`, `technical/TEST_REPORT.md` |
| `archive/AUDIT_HISTORY_V14.md` | V14 | Nhật ký kiểm toán phần 1/2 | Lịch sử | `technical/SECURITY_AUDIT.md`, `technical/KNOWN_ISSUES.md` |
| `archive/KNOWN_ISSUES_V13_V14_HISTORY.md` | V13–V14 | KNOWN_ISSUES nguyên văn trước 14/11/2026 (nhật ký theo từng lần cập nhật) | Nhiều mục bị các cập nhật sau vượt qua (vd. hàm "chưa viết" nay đã có) | `technical/KNOWN_ISSUES.md` (viết lại 14/11/2026) |
| `archive/addons/alep-0.1/` (`App.jsx.patch`, `HUONG_DAN.md`) | V11-era add-on | Patch + hướng dẫn thêm thẻ "Mức nắm vững" (ALEP 0.1) | Tính năng đã nằm trong `src/adaptive/` và `src/App.jsx`; patch không được script/README/build nào tham chiếu | `technical/ARCHITECTURE.md` |
| `archive/addons/docx-image-import/` (`App.jsx.patch`, `HUONG_DAN.md`) | V11-era add-on | Patch + hướng dẫn nhập ảnh từ DOCX | Tính năng đã nằm trong `src/docx-import/`, `src/components/docx-import/`; patch không được tham chiếu | `technical/ARCHITECTURE.md` |
| `archive/addons/quiz-engine-v2/HUONG_DAN_GD2.md` | V11-era add-on | Hướng dẫn Quiz Engine V2 giai đoạn 2 | Tính năng đã nằm trong `src/quiz-v2/` | `technical/ARCHITECTURE.md` |

Bằng chứng không còn tham chiếu patch: tìm kiếm `\.patch`/`addons/` trong toàn bộ `*.json`, `*.mjs`, `*.cjs`, `*.js`, `*.sh`, `*.md` ngoài `docs/archive` chỉ cho thấy mục `*.patch` trong danh sách `ignore` của Hosting (`firebase*.json`), không có script build/test nào dùng.

Không đưa vào `archive/`: `docs/WORK_LOG.md` (nhật ký phiên làm việc, vẫn được cập nhật) và `docs/NEXT_TASKS.md` (tài liệu hiện hành).
