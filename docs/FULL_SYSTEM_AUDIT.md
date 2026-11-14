# FULL_SYSTEM_AUDIT — V14 Commercial Edition (phiên 12/11/2026)
Trạng thái: PASS (có bằng chứng chạy thật) · PARTIAL · FAIL · BLOCKED (thiếu mạng/công cụ) · NOT VERIFIED.
Môi trường kiểm chứng: Linux sandbox, Node v22.23.4, **không có mạng** (không `npm ci`, không `npm audit`, không firebase-tools), esbuild 0.28.2 có sẵn trong sandbox (không phải bản 0.25 pin trong package.json).
Bản gốc đối chiếu: `THIEN_KIEU_BI_CANH_V14_FULL_SOURCE.zip` (giữ nguyên, không sửa).

## Đối chiếu báo cáo cũ với source thật
| Khẳng định cũ | Kiểm tra thực tế | Kết luận |
|---|---|---|
| `tools/preflight.mjs`, `tools/make-lockfiles.ps1` | Không tồn tại trong zip gốc | Báo cáo cũ sai. Đã TẠO `tools/preflight.mjs` thật; `make-lockfiles.ps1` KHÔNG tạo (lockfile phải sinh bằng `npm install`) |
| Lockfile | Không có `package-lock.json` / `functions/package-lock.json` trong zip | FAIL (BLOCKED: cần mạng). Lưu ý: người dùng đã `npm ci` được trên Windows => lockfile tồn tại trên máy họ, KHÔNG nằm trong zip này — phải lấy từ máy đó |
| `npm run test:all`, `check`, `emulators` | Không có trong package.json gốc | Đã thêm, trỏ vào file có thật |
| `js/app.min.js` đồng bộ `src/` | `build --check`: hash khác (1b8a7fdae7 vs 88c94a0693) | Bundle cũ KHÔNG đồng bộ — đã build lại |
| App.jsx: 32 `safeUserUpdate`, 12 `increment` | Đếm lại: 32 / 12 (gồm 1 dòng import) | Khớp; nay còn 29 (28 lời gọi + import) / 5 |
| Backend 20 Cloud Functions | `functions/index.js` có 20 export (16 onCall + 3 schedule + getResearchStats) | Khớp |
| Test 16/16 FE, 33/33 BE | Thực tế: root 11 + frontend 90 + functions 33 = **134 test, 134 pass** (Node 22, Linux) | Số cũ lệch; số mới có bằng chứng |

## Hạng mục
| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Build không phụ thuộc `sh` (`tools/build.mjs`) | PASS (Linux, esbuild 0.28.2) | `build` + `build:check` exit 0, bundle 477.7 KB. CHƯA thử trên Windows PowerShell thật |
| Cache version index.html | PASS | `?v=` = hash nội dung, tự cập nhật |
| `npm run build/test/test:all/check/emulators` tồn tại | PASS (khai báo + file đích có thật) | `tools/preflight.mjs` |
| Test (root 11, frontend 90, functions 33) | PASS | chạy thật |
| check-globals (biến chưa khai báo) | PASS | chạy thật (dùng TypeScript của sandbox) |
| Cú pháp/biên dịch toàn bộ src sau sửa | PASS | esbuild bundle thành công |
| Lockfile | FAIL / BLOCKED | không có mạng |
| Node thống nhất 22 | PASS (cấu hình) / NOT VERIFIED (deploy) | `.nvmrc`, engines, `runtime: nodejs22`. Tra cứu 12/11/2026: Node 20 decommission 30/10/2026 (đã qua); Node 22 deprecation 30/4/2027, decommission 31/10/2027; Node 24 có sẵn cho Functions. **Phải nâng Node 24 trước 30/4/2027** |
| `npm audit` / vulnerabilities | BLOCKED | xem `docs/DEPENDENCY_SECURITY_AUDIT.md` (27+8 lỗ hổng là số từ máy người dùng, CHƯA phân loại được) |
| Firebase Emulator (cấu hình Auth/Firestore/Functions/Hosting/UI) | PARTIAL | cấu hình + script + seed viết xong; KHÔNG chạy được ở đây |
| Storage Emulator | N/A | source không dùng Firebase Storage (grep) |
| Security Rules hardened + test | NOT VERIFIED | cần Emulator |
| Hardcode project người bán | PASS (code cấu hình) | `src/config/firebase.js` đọc `js/firebase-config.js`; `.env.example`, `firebase.json` sạch. Còn URL GitHub Pages của người bán trong `index.html`/`dieu-khoan.html` (SEO/điều khoản) — người mua phải đổi |
| Bundle cũ trong zip chứa project người bán | FIXED bằng build lại | |
| Client nối backend | PARTIAL | THÊM phiên này: `renameUser`, `createGuild`, `leaveGuild`; GỠ chốt mùa/Tông môn/Đạo Hữu Bảng ở client (server đã có `finalize*`) |
| Quiz chấm điểm phía server | FAIL | server vẫn không có đáp án |
| Còn ghi trực tiếp từ client (28 lời gọi `safeUserUpdate`, 5 `increment`) | FAIL | phân loại bên dưới |
| Auth (email giả, quên/đổi mật khẩu, xác minh), Custom Claims admin, App Check, audit log admin | FAIL | chưa làm |
| Tách App.jsx (≈483 KB, 1 file) | FAIL | chưa làm — đúng quy tắc "không refactor lớn khi chưa có baseline test Emulator" |
| UI/UX, E2E, browser smoke, performance, demo | FAIL / NOT VERIFIED | chưa làm |

## Các điểm ghi client còn lại (App.jsx) — phân loại
**Kinh tế/điểm — PHẢI chuyển server (chưa làm):**
- Gacha (`handleGachaRoll`, RNG phía client trừ/cộng Linh Thạch, Sao, vật phẩm) — chưa có function.
- Thưởng ải video (`nextVideoQuizRound`: cộng Linh Thạch/Danh Vọng) — thiếu `claimVideoQuizRound`.
- `studySeconds` (số liệu xếp hạng) ghi từ client khi học video.
- Gia nhập Tông môn / chấp nhận lời mời (3 chỗ ghi `guild:`), kick/chuyển bang chủ — thiếu `joinGuild`, `kick`, `transferLeader`.
- Mua gói âm thanh: đã gọi `purchaseItem` nhưng còn ghi thêm `sfxPack` từ client.
**Nội dung cá nhân (ít rủi ro kinh tế, cần rules chặt):** thư viện bí tịch (`library`), ghi chú video, Đạo Lộ (`examPath*`), ảnh/bio, email khôi phục, bạn bè/lời mời (cần chuyển subcollection).
Rules hiện deploy (`firestore.rules` bản V11) vẫn có lỗ hổng; bản `hardened` CHƯA được kích hoạt vì client chưa nối hết và chưa chạy Emulator.
