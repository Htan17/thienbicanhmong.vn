# CLEANUP_REPORT — V15.0.0-rc.0 → CLEAN COMMERCIAL EDITION (14/11/2026)

Nguồn: `THIEN_KIEU_BI_CANH_V15_COMMERCIAL_SOURCE.zip` (SHA-256 `3169f8dd3b92802f84d97c7a1f01fb96389a2244b84b87f36437849e76fa011c`, giữ nguyên làm backup ngoài thư mục làm việc). Đây là đợt dọn dẹp, không viết lại ứng dụng, không đổi số phiên bản (`15.0.0-rc.0`), không deploy.

## 1–2. Cấu trúc trước / sau
ZIP gốc không có `.git` (không có lịch sử Git để so sánh). Thư mục gốc gói gốc là `V15/`; gói mới đặt tên `THIEN_KIEU_BI_CANH_V15_CLEAN_COMMERCIAL_EDITION/`.

Trước: `docs/` có `commercial/ guides/ technical/ legal/ history/` + `README.md`, `NEXT_TASKS.md`; `history/` lẫn tài liệu V11–V14 và add-on `.patch`.
Sau: giữ nguyên cách chia `guides/ technical/ commercial/ legal/`; `history/` → `archive/`; `WORK_LOG.md` lên `docs/`; thêm `PROJECT_STATUS.md`, `FILE_INVENTORY.md`, `ARCHIVE_INDEX.md`, `CLEANUP_REPORT.md`, `CLEANUP_CHANGELOG.md`. Các phần còn lại (`src/ functions/ tests/ tools/ js/ css/ index.html` và cấu hình Firebase ở gốc) không đổi vị trí.

**Khác với cấu trúc đề xuất của yêu cầu (có chủ ý, vì đề xuất là tham khảo):** không làm phẳng `docs/` thành 20+ file riêng và không đổi sang UPPER_SNAKE_CASE hàng loạt, vì `docs/` đã được gộp và có mục lục, các lệnh `npm run docs:api`/`docs:structure` ghi thẳng vào `docs/technical/…`, và tách lại sẽ tạo nhiều file mới trái nguyên tắc "không tạo hàng chục file không cần thiết". Không tạo `public/` (Hosting phục vụ thư mục gốc, di chuyển sẽ đổi URL), không tạo `scripts/`, không di chuyển module `src/`, `tests/`, `tools/` (nguy cơ vỡ import/đường dẫn). Không tạo `LICENSE` (xem mục 12).

## 3–5. Số lượng
| | Trước | Sau |
|---|---|---|
| File | 152 | 158 |
| Thư mục (không tính gốc) | 32 | 32 |
| Dung lượng | 1.77 MB (1.852.123 byte) | 1.81 MB (1.898.743 byte) |

Số liệu "sau" đo trên cây thư mục đóng gói, đã gồm các file báo cáo mới. Dung lượng tăng vì thêm 6 file tài liệu và bản sao lưu trữ của KNOWN_ISSUES; không file nào bị xoá.

## 6–9. Hợp nhất / di chuyển / lưu trữ / xoá
| Hạng mục | Số lượng | Chi tiết |
|---|---|---|
| Tài liệu hợp nhất mới | 0 | Không hợp nhất thêm; 7 file đã gộp từ trước được sửa dòng nguồn tự tham chiếu sai |
| File di chuyển (không archive) | 1 | `docs/history/WORK_LOG.md` → `docs/WORK_LOG.md` |
| File lưu trữ | 9 | 4 tài liệu (`README_V11`, `FINAL_REPORT`→`_V13`, `FULL_SYSTEM_AUDIT`→`_V14`, `AUDIT_HISTORY`→`_V14`) + 5 file add-on (2 `.patch`, 3 `HUONG_DAN`) → `docs/archive/`; thêm 1 bản sao nguyên văn KNOWN_ISSUES cũ |
| File xoá | **0** | Không có file REMOVE_CONFIRMED: không tìm thấy node_modules/cache/log/.DS_Store/ZIP lồng/backup; so SHA-256 toàn bộ file không có hai file trùng nội dung. File 0-giá-trị không bị xoá chỉ vì nhỏ hay cũ |
| File sửa nội dung | 24 | xem `CLEANUP_CHANGELOG.md` và `FILE_INVENTORY.md` |
| File mới | 6 | `PROJECT_STATUS`, `FILE_INVENTORY`, `ARCHIVE_INDEX`, `CLEANUP_REPORT`, `CLEANUP_CHANGELOG`, `archive/KNOWN_ISSUES_V13_V14_HISTORY` |

Quyền file được chuẩn hoá (gốc lẫn 640/644 → 644; `build.sh` giữ thực thi). Patch được lưu trữ vì không script/README/build nào tham chiếu (chỉ có mục `*.patch` trong danh sách `ignore` của Hosting) và tính năng tương ứng đã nằm trong `src/`. `tools/apply-app-edits.py` và `tools/split-app.cjs` (script một lần của thời V11) được ghi **NEEDS_INVESTIGATION** và giữ nguyên.

## 10. File giữ nguyên
121 file giữ nguyên nội dung, gồm toàn bộ `functions/`, toàn bộ `src/` (không sửa dòng code nào), `tests/`, `css/`, `js/boot.js`, `firebase*.json`, `firestore.rules.hardened`, `.env.example`, `.firebaserc.example`, `.nvmrc`, `dieu-khoan.html`, `tailwind/postcss/vite config`, `build.sh`, `tools/*` (trừ `run-tests.mjs`).

## 11. Lỗi đồng bộ phiên bản và tài liệu đã sửa
| Vấn đề tìm thấy | Xử lý |
|---|---|
| `js/app.min.js` **lệch `src/`**: không chứa `rollGacha`, `joinGuild`, `claimVideoQuizRound`, `kickGuildMember`, `transferGuildLeader`, `equipItem`, `verifyBeforeUpdateEmail` (có trong `src/`); `build:check` FAIL | Build lại bằng `tools/build.mjs`; `index.html` `?v=37b056afb0` → `?v=e6162045b0`; sau đó `build:check` PASS. **Lưu ý:** esbuild 0.28.2 (có sẵn ngoài dự án) khác bản pin `^0.25.0`. Đây là thay đổi hành vi duy nhất của sản phẩm: bundle giờ phản ánh đúng `src/` |
| `package.json` mô tả "V14" | Sửa thành V15 (release candidate); `version` giữ `15.0.0-rc.0` |
| Số test mâu thuẫn: 134/134 (11/90/33), 151/151 (11/91/49), TEST_REPORT 90/90 và 33/33, KNOWN_ISSUES 10/10 | Chạy lại: root 11 + frontend 91 + functions 50 = **152/152**; ghi vào TEST_REPORT, READINESS, DEPLOYMENT; số cũ nêu rõ là lịch sử. (Số 151 trong bản gốc không tái hiện được: bản này cho 152) |
| `READINESS_AND_ROADMAP.md`: "94 file/29 hàm", "bundle là bản cũ", mục V14 trộn lẫn với số liệu mới | Sửa thành 99 file / 28 hàm / mô tả bundle đúng; đặt banner "BÁO CÁO LỊCH SỬ" cho mục V14 |
| `KNOWN_ISSUES.md` ghi V13-WIP, liệt kê hàm "chưa viết" đã có, ResearchDashboard "chưa nối" (đã render trong `App.jsx`) | Viết lại theo code hiện tại; bản cũ lưu nguyên văn ở archive |
| `NEXT_TASKS.md` còn các mục server đã có trong code | Viết lại, ghi rõ "code có, chưa kiểm chứng" |
| `DEPLOYMENT_AND_HANDOVER.md`: `./build.sh`, "23 test backend", "hàm Tông Môn chưa viết", `npm ci` khi chưa có lockfile, "28 chỗ client ghi" | Sửa theo số đo (20 `safeUserUpdate`), thêm chú thích lockfile |
| README quick-start dùng `npm ci` dù chưa có lockfile (sẽ lỗi) | README viết lại: `npm install` lần đầu |
| Dòng "Gộp từ: X, X, X" tự tham chiếu ở 7 tài liệu gộp; "A và A" lặp ở 2 chỗ | Thay bằng ghi chú nguồn đúng |
| `firestore.rules` trỏ tới `docs/RULES_AUDIT_REPORT.md` và `docs/CLIENT_WRITE_AUDIT.md` không tồn tại; `SECURITY_AUDIT.md` dẫn đường dẫn cũ | Sửa chú thích/đường dẫn (không đổi logic rules) |
| `npm run test:integration` (`node --test tests/integration/`) lỗi trên Node 22 | Thêm nhóm `integration` vào `tools/run-tests.mjs`, đổi script |

## 12. Vấn đề chưa xử lý (không tự quyết)
- Lockfile (2 file): BLOCKED, không có mạng; không tạo tay. `npm audit`: BLOCKED.
- `dieu-khoan.html` còn tuyên bố "phi thương mại"; `index.html`/`dieu-khoan.html` còn URL GitHub Pages của người bán. Giữ nguyên, đã ghi trong KNOWN_ISSUES và LICENSE_AND_ASSETS (cần người mua/luật sư).
- Chưa có file `LICENSE`: quyền sở hữu chưa xác minh, không tự tạo giấy phép thay chủ sở hữu.
- Một số tài liệu trong danh sách mong muốn (`THIRD_PARTY_ASSETS`, `BACKUP_RESTORE`, `SERVICE_COST_ESTIMATE`…) vẫn là mục trong các file gộp, không tách ra file riêng.
- `App.jsx` 4.757 dòng: chỉ ghi nhận (xem `technical/STRUCTURE_REPORT.md`, báo cáo sinh lại giống hệt bản cũ), không tách.
- STRUCTURE_REPORT nêu 3 import có vẻ không dùng trong file test/`main.jsx` và `src/config/constants.js` không ai import: chưa xác minh, giữ nguyên.
- 2 script một lần trong `tools/` (NEEDS_INVESTIGATION), các tuyên bố "chưa kiểm chứng" khác trong KNOWN_ISSUES.

## 13. Kiểm tra import
172 import tương đối trong `src/`, `functions/`, `tests/`, `tools/` được phân giải tĩnh: **0 thiếu**. 8 file JSON hợp lệ. Script `package.json` trỏ tới file tồn tại (preflight: không có FAIL ngoài lockfile). Liên kết/đường dẫn trong tài liệu: kiểm tra bằng script; còn lại chỉ là tham chiếu có chủ ý tới file người dùng tự tạo (`js/firebase-config.js`), lockfile chưa có và đường dẫn lịch sử trong archive/CHANGELOG/WORK_LOG. Quét credentials (khoá API, private key, service account) trong source và bundle: không phát hiện.

## 14–17. Kết quả kiểm tra (14/11/2026, Node 22.23.4, không mạng)
| Hạng mục | Kết quả |
|---|---|
| Build (`tools/build.mjs`) + `--check` | PASS (esbuild 0.28.2; chạy trên bản sao ngoài dự án vì chưa cài `node_modules`) |
| Unit tests | PASS 152/152 (root 11, frontend 91, functions 50) |
| `check:globals` | PASS |
| `preflight` | 2 FAIL (lockfile), 2 WARN (chưa cài `node_modules`) |
| Integration tests | BLOCKED (thiếu `firebase-admin` trong `functions/`, không có Emulator) |
| Security Rules tests | BLOCKED (thiếu `@firebase/rules-unit-testing`, firebase-tools) |
| `npm ci`, `npm audit`, Emulator, E2E | BLOCKED / NOT RUN |

## 18. Trạng thái bàn giao
Gói **sạch, nhất quán về cấu trúc và số liệu đã đo**, nhưng sản phẩm vẫn **NOT PRODUCTION READY** (xem `PROJECT_STATUS.md`). Không deploy Firebase, không đổi Project ID, không có credentials thật trong gói. Người mua cần: tạo lockfile bằng `npm install`, build lại bằng esbuild đúng pin, chạy Emulator/rules/integration, rà pháp lý.
