# Thiên Kiêu Bí Cảnh — V15.0.0-rc.0 (Clean Commercial Edition)

Ứng dụng web học tập theo cơ chế trò chơi chủ đề tu tiên: quiz, ôn thẻ lặp lại (SRS), học qua video, nhập đề từ DOCX, tạo câu hỏi bằng Gemini (khoá của người dùng), cửa hàng, gacha, Tông môn, mùa giải, bảng xếp hạng.

> **Trạng thái: release candidate, NOT PRODUCTION READY.** Unit test (152) đạt; Emulator, Rules, Integration, E2E và load test **chưa có kết quả**; chưa có lockfile. Chi tiết trung thực: [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

## Công nghệ
Frontend React tĩnh (build bằng esbuild từ `src/` ra `js/app.min.js`; React/Firebase SDK nạp qua CDN trong `index.html`) · Firebase Auth, Firestore, Cloud Functions (Node 22, region `asia-southeast1`), Hosting · Tailwind (build tuỳ chọn) · Gemini theo khoá của người dùng (BYOK).

## Yêu cầu
Node 22.x (`.nvmrc`), npm 10. Firebase Emulator cần Java và `firebase-tools` (có trong devDependencies sau khi cài).

## Cài đặt và chạy
```
npm install              # lần đầu (gói CHƯA có package-lock.json); sau khi commit lockfile thì dùng: npm ci
cd functions && npm install && cd ..
npm run check            # kiểm tra môi trường/cấu trúc (hiện báo FAIL lockfile cho tới khi tạo lockfile)
npm run build            # src/ -> js/app.min.js (và cập nhật ?v= trong index.html)
npm run build:check      # xác nhận bundle khớp src/ (cần đúng phiên bản esbuild đã build)
npm run test:all         # unit test (root + frontend + functions), không cần mạng/Emulator
npm run emulators        # Emulator Auth/Firestore/Functions/Hosting/Pub/Sub, project giả demo-tkbc
```
Khi Emulator đang chạy, ở terminal khác: `npm run emulators:seed`, `npm run test:integration`. `npm run test:rules` tự bật Firestore Emulator (cổng 8080), cần tắt Emulator đang chạy trước. Cấu hình client cho project của bạn: sao chép `js/firebase-config.example.js` thành `js/firebase-config.js` (đã nằm trong `.gitignore`). Hướng dẫn đầy đủ: [`docs/guides/LOCAL_DEVELOPMENT.md`](docs/guides/LOCAL_DEVELOPMENT.md).

## Cấu trúc thư mục
| Đường dẫn | Nội dung |
|---|---|
| `src/` | Mã nguồn React: `App.jsx` (điều phối, 268 dòng), `app/` (hook lõi/điều hướng/đồng bộ), `features/` (14 nhóm tính năng: hook + màn hình), `components/`, `lib/`, `config/`, và module theo tính năng `adaptive/`, `docx-import/`, `quiz-v2/` |
| `functions/` | Cloud Functions: `index.js`, `lib/` (logic thuần), `scripts/` (admin/di trú, chạy bằng Admin SDK), `test/` |
| `tests/` | `rules/` (Firestore Rules), `integration/` (Emulator), `fixtures/`, và test lọc nội dung/kiểm duyệt |
| `tools/` | Build, test runner, preflight, seed Emulator, sinh tài liệu; vài script một lần (xem `docs/FILE_INVENTORY.md`) |
| `js/`, `css/`, `index.html`, `dieu-khoan.html` | Trang tĩnh phục vụ qua Hosting; `js/app.min.js` là **bản build** |
| `firebase*.json`, `firestore.rules`, `firestore.rules.hardened`, `firestore.indexes.json`, `.firebaserc.example`, `.env.example` | Cấu hình Firebase. `firestore.rules` là bản cũ còn lỗ hổng đang được deploy; `.hardened` là đích chưa kích hoạt |
| `docs/` | Toàn bộ tài liệu, mục lục tại [`docs/README.md`](docs/README.md); tài liệu cũ ở `docs/archive/` |

## Tài liệu nên đọc tiếp
1. [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — trạng thái hiện hành và bằng chứng
2. [`docs/guides/DEPLOYMENT_AND_HANDOVER.md`](docs/guides/DEPLOYMENT_AND_HANDOVER.md) — triển khai Firebase của người mua và bàn giao
3. [`docs/technical/ARCHITECTURE.md`](docs/technical/ARCHITECTURE.md) · [`API_DOCUMENTATION.md`](docs/technical/API_DOCUMENTATION.md) · [`SECURITY_AUDIT.md`](docs/technical/SECURITY_AUDIT.md) · [`KNOWN_ISSUES.md`](docs/technical/KNOWN_ISSUES.md) · [`TEST_REPORT.md`](docs/technical/TEST_REPORT.md)
4. [`docs/commercial/READINESS_AND_ROADMAP.md`](docs/commercial/READINESS_AND_ROADMAP.md) · [`docs/legal/LICENSE_AND_ASSETS.md`](docs/legal/LICENSE_AND_ASSETS.md)
5. [`docs/NEXT_TASKS.md`](docs/NEXT_TASKS.md) · [`CHANGELOG.md`](CHANGELOG.md) · [`docs/CLEANUP_REPORT.md`](docs/CLEANUP_REPORT.md)

## Giới hạn hiện tại
Còn 20 chỗ client ghi trực tiếp (`safeUserUpdate`); quiz không chấm phía server; chưa có App Check; Rules hardened chưa test/kích hoạt; `App.jsx` đã tách (4.757 → 268 dòng, xem `docs/REFACTOR_REPORT.md`); `dieu-khoan.html` còn tuyên bố "phi thương mại"; tài nguyên bên thứ ba và quyền sở hữu chưa xác minh; chưa có file `LICENSE`. Danh sách đầy đủ: [`docs/technical/KNOWN_ISSUES.md`](docs/technical/KNOWN_ISSUES.md).

## Trạng thái thương mại
Chưa đủ điều kiện bàn giao như sản phẩm sẵn sàng vận hành. Không có số liệu người dùng, doanh thu hay định giá được kiểm chứng trong gói này.
