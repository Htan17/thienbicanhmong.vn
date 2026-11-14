# PROJECT_STATUS — V15.0.0-rc.0

Cập nhật: 14/11/2026 (đợt dọn dẹp & chuẩn hoá). Phiên bản theo `package.json`: **15.0.0-rc.0** (release candidate, không phải bản Stable; đợt dọn dẹp không đổi số phiên bản).

## Kết luận
**NOT PRODUCTION READY.** Mã nguồn và tài liệu nhất quán với nhau về mặt cấu trúc và số liệu đã đo; các hạng mục dưới đây chưa được kiểm chứng.

## Bằng chứng đã có (chạy 14/11/2026, Node 22.23.4, không mạng)
| Hạng mục | Kết quả |
|---|---|
| Unit test root / frontend / functions | PASS 11 / 91 / 50 (tổng 152) |
| `check:globals` | PASS |
| `build:check` | PASS với esbuild 0.28.2 (bản pin `^0.25.0` chưa dùng được vì chưa cài dependencies) |
| `preflight` | 2 FAIL (thiếu lockfile), 2 WARN (chưa cài `node_modules`) |
| Quét credentials thật (khoá API, private key, service account) trong source | Không phát hiện |

## Chưa có bằng chứng
| Hạng mục | Nhãn |
|---|---|
| `npm ci`, lockfile, `npm audit` | BLOCKED (không có mạng) |
| Firestore Rules test | BLOCKED (thiếu `@firebase/rules-unit-testing`, firebase-tools) |
| Integration test | BLOCKED (thiếu `firebase-admin` trong `functions/`, không có Emulator) |
| Emulator, E2E, browser smoke, responsive, load test | NOT RUN |
| Cloud Functions trên Emulator/staging/production | NOT VERIFIED |
| Deploy Firebase (staging hay production) | KHÔNG thực hiện |

## Thành phần chính
| Thành phần | Quy mô đo được |
|---|---|
| `src/` (React) | 99 file JS/JSX/MJS trong phạm vi quét ≈11.500 dòng; `App.jsx` 4.757 dòng |
| `functions/index.js` | 28 hàm (xem `technical/API_DOCUMENTATION.md`) |
| Test | 17 file unit (root 2, frontend 7, functions 8) + 1 file integration + 1 file rules |
| Client ghi trực tiếp còn lại | 20 `safeUserUpdate`, 1 `increment(` trong `App.jsx` |

## Lưu ý đặc biệt
- `js/app.min.js` của gói gốc lệch `src/`; đã build lại trong đợt dọn dẹp này (chi tiết `CLEANUP_REPORT.md`). Cần build lại sau khi có lockfile.
- `firestore.rules` đang deploy là bản cũ còn lỗ hổng; `firestore.rules.hardened` chưa kích hoạt.
- Chưa có `LICENSE`; quyền sở hữu là bản nháp chưa xác minh (`legal/LICENSE_AND_ASSETS.md`).

Việc tiếp theo: `NEXT_TASKS.md`. Vấn đề chi tiết: `technical/KNOWN_ISSUES.md`.
