# TEST_REPORT — V15.0.0-rc.0 (chạy lại 14/11/2026)

Môi trường: Linux sandbox, Node v22.23.4, npm 10.9.9, **không có mạng**, chưa cài `node_modules`, esbuild 0.28.2 có sẵn ngoài dự án (bản pin `^0.25.0`). Không có firebase-tools, trình duyệt thật hay Emulator. Lệnh chạy trên bản đã dọn (`THIEN_KIEU_BI_CANH_V15_CLEAN_COMMERCIAL_EDITION`).

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run test` (tests/*.test.mjs) | **PASS** 11/11 | lọc từ khoá + kiểm duyệt |
| `npm run test:frontend` (src/**/*.test.*) | **PASS** 91/91 | adaptive, docx-import, quiz-v2, quizFingerprint |
| `npm run test:functions` | **PASS** 50/50 | kinh tế, catalog khớp gameData, parity, checkpoint, guild, region, equip, admin |
| Tổng unit | **PASS** 152/152 | root 11 + frontend 91 + functions 50 |
| `node tools/check-globals.cjs` | **PASS** | không có biến chưa khai báo |
| `node tools/build.mjs --check` | **PASS** (có điều kiện) | bundle `e6162045b0` khớp `src/` với esbuild 0.28.2; sẽ báo lệch nếu dùng esbuild khác bản này |
| `node tools/preflight.mjs` (`npm run check`) | **FAIL** 2 / WARN 2 | thiếu 2 lockfile (BLOCKED: cần mạng); chưa cài `node_modules` |
| `npm ci` (gốc, `functions/`) | **BLOCKED** | không có lockfile và không có mạng |
| `npm run test:rules` | **BLOCKED** | thiếu `@firebase/rules-unit-testing` và firebase-tools (`ERR_MODULE_NOT_FOUND`) |
| `npm run test:integration` | **BLOCKED** | thoát ngay với "Thiếu firebase-admin: chạy `npm ci` trong functions/" (chưa cài dependencies); ngoài ra cần Emulator đang chạy. Chưa có kết quả logic |
| Emulator, E2E, browser smoke, responsive, load test | **NOT RUN** | |

Các test đạt là test đơn vị/logic; chúng KHÔNG chứng minh Rules, Firestore, Cloud Functions hay giao diện hoạt động end-to-end.

## Ghi chú về số liệu cũ
Các số 134/134 (11/90/33), 151/151 (11/91/49) và 90/90, 33/33 trong tài liệu cũ là kết quả của các lần chạy trước và **không** còn là số hiện hành. Lần chạy này: 11/91/50 = 152.

## Thay đổi script liên quan tới kiểm thử (14/11/2026)
`npm run test:integration` trước đây là `node --test tests/integration/`; trên Node 22 lệnh này lỗi `Cannot find module '.../tests/integration'` (không nhận thư mục). Đã đổi thành `node tools/run-tests.mjs integration` (thêm nhóm `integration` vào runner). Chưa chứng minh được test tích hợp đạt vì thiếu Emulator.
