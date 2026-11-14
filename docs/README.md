# Mục lục tài liệu

| Thư mục | File | Nội dung |
|---|---|---|
| `guides/` | `LOCAL_DEVELOPMENT.md` | Cài đặt, chạy local, Emulator, test |
| | `DEPLOYMENT_AND_HANDOVER.md` | Triển khai Firebase của người mua, bàn giao, sao lưu/khôi phục |
| `technical/` | `ARCHITECTURE.md` | Kiến trúc thực tế của source |
| | `API_DOCUMENTATION.md` | Cloud Functions (sinh tự động: `node tools/gen-api-docs.mjs > docs/technical/API_DOCUMENTATION.md`) |
| | `SECURITY_AUDIT.md` | Rules, các ghi từ client, bảo mật phụ thuộc |
| | `PERFORMANCE_AND_COST.md` | Số đo tĩnh, điểm nghẽn, yếu tố chi phí (không có số tiền) |
| | `TEST_REPORT.md` | Kết quả kiểm thử đã chạy |
| | `KNOWN_ISSUES.md` | Vấn đề đã biết |
| | `STRUCTURE_REPORT.md` | Phân tích cấu trúc (sinh: `node tools/analyze-structure.mjs --md > docs/technical/STRUCTURE_REPORT.md`) |
| `commercial/` | `PRODUCT_AND_FEATURES.md` | Mô tả sản phẩm và ma trận tính năng |
| | `READINESS_AND_ROADMAP.md` | Mức sẵn sàng, due diligence, lộ trình P0/P1/P2 |
| `legal/` | `LICENSE_AND_ASSETS.md` | Bản quyền, tài nguyên bên thứ ba, đóng góp của AI (chưa xác minh) |
| `history/` | `WORK_LOG.md`, `FINAL_REPORT.md`, `FULL_SYSTEM_AUDIT.md`, `AUDIT_HISTORY.md`, `README_V11.md`, `addons/` | Lịch sử làm việc và tài liệu cũ (chỉ để tham khảo) |
| (gốc docs) | `NEXT_TASKS.md` | Việc cần làm tiếp |

Các file trong `guides/`, `technical/`, `commercial/`, `legal/` ghi rõ nguồn gộp ở dòng đầu để truy lại nội dung gốc.
