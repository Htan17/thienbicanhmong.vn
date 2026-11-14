# Thiên Kiêu Bí Cảnh — V14 Commercial Edition (WIP) — **CHƯA đạt Commercial/Production Ready**
Tên gói theo yêu cầu bàn giao, nhưng trạng thái thật nằm ở `FINAL_REPORT.md` và `docs/KNOWN_ISSUES.md`. README gốc V11: `README.md.v11`.

## Đã chạy thật
- `npm run test:functions` (Node, không cần mạng): 23 test (kinh tế, giá, region frontend=backend, catalog khớp gameData.js, parity streak/khung giờ với client).
- `node --test tests/*.test.mjs`: 11 test V11 (lọc từ khoá, kiểm duyệt).
## Chưa chạy / chưa làm
`npm ci`, build (`./build.sh` cần esbuild), Firebase Emulator, rules tests (`npm run test:rules`), E2E, staging, nối phần lớn luồng kinh tế vào backend.

## Tài liệu
`docs/BUYER_HANDOVER.md` (tình trạng thật + việc còn lại), `docs/KNOWN_ISSUES.md`, `docs/CLIENT_WRITE_AUDIT.md`, `FINAL_REPORT.md`.

## Cấu trúc
`src/` ứng dụng · `functions/` Cloud Functions + `lib/` logic thuần · `firestore.rules` (đang deploy, bản V11) · `firestore.rules.hardened` (đích) · `docs/CLIENT_WRITE_AUDIT.md` danh sách ghi client cần chuyển.


## Bắt đầu (Windows, Node 22)
`npm install` → `npm run check` → `npm run build` → `npm run test:all` → `npm run emulators`. Chi tiết: `docs/INSTALLATION_GUIDE.md`, `docs/FIREBASE_LOCAL_DEVELOPMENT.md`, `docs/FIREBASE_BUYER_DEPLOYMENT_GUIDE.md`. Trạng thái thật: `COMMERCIAL_READINESS_REPORT.md`.
