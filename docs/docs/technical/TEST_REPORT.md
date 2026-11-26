# TEST_REPORT — V15.0.0-rc.0 (chạy lại 14/11/2026)

Môi trường: Linux sandbox, Node v22.23.4, npm 10.9.9, **không có mạng**, chưa cài `node_modules`, esbuild 0.28.2 có sẵn ngoài dự án (bản pin `^0.25.0`). Không có firebase-tools, trình duyệt thật hay Emulator. Lệnh chạy trên bản đã dọn (`THIEN_KIEU_BI_CANH_V15_CLEAN_COMMERCIAL_EDITION`).

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run test` (tests/*.test.mjs) | **PASS** 11/11 | lọc từ khoá + kiểm duyệt |
| `npm run test:frontend` (src/**/*.test.*) | **PASS** 91/91 | adaptive, docx-import, quiz-v2, quizFingerprint |
| `npm run test:functions` | **PASS** 50/50 | kinh tế, catalog khớp gameData, parity, checkpoint, guild, region, equip, admin |
| Tổng unit | **PASS** 195/195 | root 14 + frontend 131 + functions 50 (đo lại REV5; +3 test tương phản màu) |
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

## Kiểm chứng bổ sung sau khi tách `App.jsx` (REV2, 2026-11-23 04:2x UTC)
Môi trường: sandbox Linux, Node v22.23.4, không mạng; esbuild 0.28.2, Playwright + Chromium có sẵn ngoài dự án (liên kết `node_modules` tạm trên bản sao, không nằm trong gói).

| Hạng mục | Kết quả | Trạng thái |
|---|---|---|
| Unit tests (`node tools/run-tests.mjs all`) | root 14 + frontend 131 + functions 50 = 195/195 | **PASS** |
| `node tools/build.mjs --check` trên gói nhận được | bundle `6f513e1dc9` khớp `src/`; build lại tái tạo đúng cùng hash | **PASS** (có điều kiện: esbuild 0.28.2) |
| Bản trước tách (CLEAN) cùng lệnh | `js/app.min.js` trong gói lệch (`37b056afb0` ≠ `e6162045b0`) | FAIL → đã build lại để so sánh |
| Kích thước bundle (cùng esbuild) | trước tách 490.974 byte → sau tách 511.328 byte (+4,1%) | thông tin |
| Phân tích tĩnh (`tools/analyze-structure.mjs`) | 155 file; 0 vòng import; 0 file trùng; chỉ `src/main.jsx` và `src/config/constants.js` không được import | PASS (xem NEEDS_INVESTIGATION) |
| Đối chiếu điểm ghi dữ liệu và hook trước/sau tách | `safeUserUpdate(`, `.update(`, `.set(`, `.delete(`, `.add(`, `increment(`, `arrayUnion(`, `.batch(`, `onSnapshot(`, `signInWith`, `useState`, `useEffect`, `useRef`: **khớp**; 21 hàm gọi Cloud Functions: **khớp**; 188/188 định danh cấp component của `App.jsx` cũ còn tồn tại | PASS |
| Smoke giao diện (Chromium + Firebase giả) độ sâu 1 | 16 cảnh: 0 khác biệt DOM, cùng nút, cùng lỗi trang | PASS |
| Smoke độ sâu 2 (`--depth2=3`) | 48 cảnh: 42 giống hệt, 6 khác (đều ở màn "THU") | **PARTIAL** — công cụ không ổn định: chạy lại bản trước tách cho kết quả khác nhau ở 2 màn hình; thử riêng nút "THU" 12 lần (2 bản × 3 mốc chờ × 2 lần) cho kết quả giống hệt. Không phát hiện hồi quy, cần kiểm tay |
| Smoke trên trình duyệt thật + Firebase thật, Emulator, E2E, responsive, load | | **NOT RUN** |

Các bài smoke dùng Firebase giả (`tools/smoke/fake-firebase.js`), nên không chứng minh Auth, Firestore, Rules hay Cloud Functions hoạt động.



## REV4 — kiểm tra giao diện chính tả (Chromium, Firebase giả)
Thêm thẻ tiếng Anh `definitely`, chế độ Gõ từ: (1) Chính tả chặt BẬT, gõ `definately` → CHƯA ĐÚNG, hiện 1 chữ đỏ; (2) Chính tả chặt TẮT → vẫn đúng như cũ nhưng có nhắc chuẩn chính tả; (3) nhấn Enter một lần chỉ chấm, Enter lần hai mới qua thẻ. Không lỗi console. Đây không phải E2E với Firebase thật → NOT VERIFIED trên trình duyệt/Firebase thật.
