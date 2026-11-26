# CLEANUP_CHANGELOG — đợt dọn dẹp 14/11/2026

Không đổi số phiên bản. Mỗi mục: thay đổi → lý do/bằng chứng. Danh sách đầy đủ từng file: `FILE_INVENTORY.md`.

## Source / cấu hình
1. `js/app.min.js` build lại; `index.html` `?v=37b056afb0` → `?v=e6162045b0` → bản gốc thiếu 7 tên hàm/luồng có trong `src/`; `build:check` FAIL trước, PASS sau (esbuild 0.28.2).
2. `package.json`: `description` "V14" → "V15 (release candidate)"; `test:integration` → `node tools/run-tests.mjs integration` → lệnh cũ lỗi `Cannot find module` trên Node 22. `version` không đổi.
3. `tools/run-tests.mjs`: thêm nhóm `integration` (cùng cách quét như `rules`).
4. `firestore.rules`: sửa 2 đường dẫn trong dòng chú thích đầu file (không đổi logic rules).
5. `.gitignore`: thêm `.DS_Store`, `Thumbs.db`, `*.log`, `*.swp`, `*~`, `coverage/`, `.nyc_output/`.
6. Chuẩn hoá quyền file (644; `build.sh` thực thi). Không đổi nội dung.

## Di chuyển / lưu trữ (không xoá)
7. `docs/history/` → `docs/archive/`: `FINAL_REPORT.md`→`FINAL_REPORT_V13.md`, `FULL_SYSTEM_AUDIT.md`→`FULL_SYSTEM_AUDIT_V14.md`, `AUDIT_HISTORY.md`→`AUDIT_HISTORY_V14.md`, `README_V11.md`, `addons/**` (2 `.patch`, 3 `HUONG_DAN`). 5 tài liệu ở gốc `archive/` được thêm banner "ĐÃ LƯU TRỮ"; các file trong `archive/addons/` (cả `.patch` lẫn `HUONG_DAN`) giữ nguyên từng byte.
8. `docs/history/WORK_LOG.md` → `docs/WORK_LOG.md` (nhật ký còn sống); thêm mục 31 cho đợt này; sửa 1 đường dẫn cũ.
9. Bản sao nguyên văn KNOWN_ISSUES cũ → `docs/archive/KNOWN_ISSUES_V13_V14_HISTORY.md`.

## Tài liệu viết lại / sửa
10. Viết lại: `README.md`, `docs/README.md`, `docs/technical/KNOWN_ISSUES.md`, `docs/technical/TEST_REPORT.md`, `docs/NEXT_TASKS.md` → theo trạng thái đã đo/đã đọc code.
11. Sửa chỗ: `READINESS_AND_ROADMAP.md` (số file/hàm/test, mô tả bundle, banner lịch sử), `DEPLOYMENT_AND_HANDOVER.md`, `PRODUCT_AND_FEATURES.md`, `LICENSE_AND_ASSETS.md`, `SECURITY_AUDIT.md`, và dòng nguồn "Gộp từ" ở 7 tài liệu gộp.
12. `CHANGELOG.md`: thêm mục đợt dọn dẹp (không đổi phiên bản).
13. Mới: `PROJECT_STATUS.md`, `FILE_INVENTORY.md`, `ARCHIVE_INDEX.md`, `CLEANUP_REPORT.md`, `CLEANUP_CHANGELOG.md`.

## Không thay đổi (có chủ ý)
Toàn bộ mã trong `src/` và `functions/`; `firebase.json`/`firebase.emulator-*.json`; Project ID; `firestore.rules.hardened`; `dieu-khoan.html`; không tạo lockfile; không xoá file; không deploy.
