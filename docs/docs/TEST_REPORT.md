# TEST_REPORT — 12/11/2026
Môi trường: Linux sandbox, Node v22.23.4, KHÔNG có mạng, esbuild 0.28.2. Chưa chạy trên Windows, chưa có Emulator/trình duyệt.
| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run test` (tests/*.test.mjs) | 11/11 pass | lọc từ khoá + kiểm duyệt |
| `npm run test:frontend` (src/**/*.test.js) | 90/90 pass | adaptive, docx-import, quiz-v2 |
| `npm run test:functions` | 33/33 pass | logic thuần: kinh tế, catalog khớp gameData, parity streak, checkpoint, guild, region |
| `node tools/check-globals.cjs` | OK | không có biến chưa khai báo |
| `node tools/build.mjs` + `--check` | PASS | bundle 477.7 KB, đồng bộ `src/` |
| `node tools/preflight.mjs` | 2 FAIL / 1 WARN | thiếu 2 lockfile (BLOCKED mạng); chưa cài functions/node_modules |
| `npm run test:rules`, Emulator, integration, E2E, browser smoke, responsive | CHƯA CHẠY | cần firebase-tools + mạng/trình duyệt. Ghi kết quả lần chạy đầu của bạn vào đây |
Các test trên là test đơn vị/logic; chúng KHÔNG chứng minh các luồng Firestore, Rules, Functions hoạt động end-to-end.
