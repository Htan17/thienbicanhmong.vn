# Thiên Kiêu Bí Cảnh — V15 (release candidate)

Ứng dụng web học tập theo cơ chế trò chơi chủ đề tu tiên: quiz, ôn thẻ lặp lại (SRS), học qua video, nhập đề từ DOCX, tạo câu hỏi bằng Gemini (khoá của người dùng), cửa hàng, gacha, Tông môn, mùa giải và bảng xếp hạng. Kiến trúc: frontend React tĩnh + Firebase (Auth, Firestore, Cloud Functions, Hosting).

> **Trạng thái: NOT PRODUCTION READY.** Phần lớn nghiệp vụ nhạy cảm đã chuyển sang Cloud Functions và có unit test, nhưng Emulator/Rules/Integration/E2E/load test **chưa có kết quả**. Chi tiết trung thực: [`docs/commercial/READINESS_AND_ROADMAP.md`](docs/commercial/READINESS_AND_ROADMAP.md).

## Bắt đầu nhanh (Windows hoặc macOS/Linux, Node 22)
```
npm ci
cd functions && npm ci && cd ..
npm run check        # kiểm tra môi trường và cấu trúc
npm run build        # tạo js/app.min.js từ src/
npm run test:all     # unit test (không cần mạng/Emulator)
npm run emulators    # Emulator Auth/Firestore/Functions/Hosting/Pub/Sub (project giả demo-tkbc)
```
Trong terminal khác khi Emulator đang chạy: `npm run test:integration`. Test rules cần **tắt Emulator trước** (`npm run test:rules` tự bật Firestore Emulator ở cổng 8080). Hướng dẫn đầy đủ: [`docs/guides/LOCAL_DEVELOPMENT.md`](docs/guides/LOCAL_DEVELOPMENT.md).

## Cấu trúc thư mục
| Thư mục / file | Nội dung |
|---|---|
| `src/` | Mã nguồn ứng dụng (React). `App.jsx` giao diện chính; `lib/` tiện ích; `config/` dữ liệu game; `adaptive/`, `docx-import/`, `quiz-v2/` các mô-đun theo tính năng; `components/` |
| `functions/` | Cloud Functions: `index.js` (hàm), `lib/` (logic thuần, có test), `scripts/` (admin/di trú, chạy bằng Admin SDK), `test/` |
| `tests/` | `rules/` test Firestore Rules, `integration/` test hàm trên Emulator, `fixtures/` dữ liệu seed |
| `tools/` | Build, kiểm tra, sinh tài liệu, seed Emulator |
| `docs/` | Toàn bộ tài liệu, xem mục lục [`docs/README.md`](docs/README.md) |
| `js/`, `css/`, `index.html` | Sản phẩm build và trang tĩnh (`js/app.min.js` là bản build, **phải build lại** sau khi sửa `src/`) |
| `firebase*.json`, `firestore.rules`, `firestore.rules.hardened`, `.firebaserc.example`, `.env.example` | Cấu hình Firebase (rules hardened là đích, chưa kích hoạt) |

## Tài liệu quan trọng
- Triển khai và bàn giao: [`docs/guides/DEPLOYMENT_AND_HANDOVER.md`](docs/guides/DEPLOYMENT_AND_HANDOVER.md)
- Kiến trúc: [`docs/technical/ARCHITECTURE.md`](docs/technical/ARCHITECTURE.md) · API: [`docs/technical/API_DOCUMENTATION.md`](docs/technical/API_DOCUMENTATION.md)
- Bảo mật: [`docs/technical/SECURITY_AUDIT.md`](docs/technical/SECURITY_AUDIT.md) · Vấn đề đã biết: [`docs/technical/KNOWN_ISSUES.md`](docs/technical/KNOWN_ISSUES.md)
- Bản quyền và tài nguyên bên thứ ba: [`docs/legal/LICENSE_AND_ASSETS.md`](docs/legal/LICENSE_AND_ASSETS.md)
- Việc tiếp theo: [`docs/NEXT_TASKS.md`](docs/NEXT_TASKS.md) · Lịch sử thay đổi: [`CHANGELOG.md`](CHANGELOG.md)
