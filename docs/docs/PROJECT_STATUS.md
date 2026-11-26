# PROJECT_STATUS — V15.0.0-rc.0

Cập nhật: 14/11/2026 (đợt dọn dẹp & chuẩn hoá). Phiên bản theo `package.json`: **15.0.0-rc.0** (release candidate, không phải bản Stable; đợt dọn dẹp không đổi số phiên bản).

## Kết luận
**NOT PRODUCTION READY.** Mã nguồn và tài liệu nhất quán với nhau về mặt cấu trúc và số liệu đã đo; các hạng mục dưới đây chưa được kiểm chứng.

## Bằng chứng đã có (chạy 14/11/2026, Node 22.23.4, không mạng)
| Hạng mục | Kết quả |
|---|---|
| Unit test root / frontend / functions | PASS 11 / 91 / 50 (tổng 152) |
| `check:globals` | PASS |
| `build:check` | PASS với esbuild 0.28.2; `package.json` đã pin đúng `0.28.2` (trước đó `^0.25.0` sẽ làm `build:check` báo lệch trên máy người mua). Kiểm lại sau khi có lockfile |
| `preflight` | 2 FAIL (thiếu lockfile), 2 WARN (chưa cài `node_modules`) |
| Quét credentials thật (khoá API, private key, service account) trong source | Không phát hiện |

## Chưa có bằng chứng
| Hạng mục | Nhãn |
|---|---|
| `npm ci`, lockfile, `npm audit` | BLOCKED (không có mạng) |
| Firestore Rules test | BLOCKED (thiếu `@firebase/rules-unit-testing`, firebase-tools) |
| Integration test | BLOCKED (thiếu `firebase-admin` trong `functions/`, không có Emulator) |
| Smoke giao diện (Chromium + Firebase giả, không phải E2E) | PARTIAL | 23/11/2026: 42/48 cảnh DOM giống hệt trước/sau tách; 6 cảnh khác chỉ ở 2 màn hình do công cụ smoke không ổn định (chính bản trước tách cũng cho kết quả khác nhau giữa hai lần chạy); xem `docs/REFACTOR_REPORT.md` |
| Emulator, E2E, responsive, load test | NOT RUN |
| Cloud Functions trên Emulator/staging/production | NOT VERIFIED |
| Deploy Firebase (staging hay production) | KHÔNG thực hiện |

## Thành phần chính
| Thành phần | Quy mô đo được |
|---|---|
| `src/` (React) | 155 file JS/JSX/MJS/CJS trong phạm vi quét (≈12.300 dòng, gồm test); 115 file nguồn src (≈9.400 dòng); `App.jsx` 268 dòng (trước tách: 4.757) |
| `functions/index.js` | 28 hàm (xem `technical/API_DOCUMENTATION.md`) |
| Test | 17 file unit (root 2, frontend 7, functions 8) + 1 file integration + 1 file rules |
| Client ghi trực tiếp còn lại | 19 lời gọi `safeUserUpdate(`, 1 `increment(` trong `src/` (đếm `grep` 23/11/2026; trước và sau tách không đổi) |

## Lưu ý đặc biệt
- `js/app.min.js` của gói gốc lệch `src/`; đã build lại trong đợt dọn dẹp này (chi tiết `CLEANUP_REPORT.md`). Cần build lại sau khi có lockfile.
- `firestore.rules` đang deploy là bản cũ còn lỗ hổng; `firestore.rules.hardened` chưa kích hoạt.
- Chưa có `LICENSE`; quyền sở hữu là bản nháp chưa xác minh (`legal/LICENSE_AND_ASSETS.md`).

Việc tiếp theo: `NEXT_TASKS.md`. Vấn đề chi tiết: `technical/KNOWN_ISSUES.md`.
