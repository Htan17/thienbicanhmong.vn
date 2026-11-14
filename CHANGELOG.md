# CHANGELOG
## V15.0.0-rc.0 — đợt dọn dẹp & chuẩn hoá (14/11/2026) — KHÔNG đổi số phiên bản, KHÔNG thêm tính năng
- Build lại `js/app.min.js` (bản gói gốc lệch `src/`, thiếu các thay đổi client của rc.0); cập nhật `?v=` trong `index.html`. Build bằng esbuild 0.28.2, khác bản pin `^0.25.0`.
- Sửa `npm run test:integration` (Node 22 không nhận đường dẫn thư mục): dùng `tools/run-tests.mjs integration`.
- `package.json`: sửa mô tả từ "V14" thành V15 (số phiên bản giữ nguyên `15.0.0-rc.0`). `.gitignore`: thêm file rác OS/editor/coverage.
- Tài liệu: `docs/history/` chuyển thành `docs/archive/` kèm `docs/ARCHIVE_INDEX.md`; `KNOWN_ISSUES`, `NEXT_TASKS`, `TEST_REPORT`, README viết lại theo trạng thái thực đo; sửa số liệu mâu thuẫn (134/134, 151/151, 90/90, 33/33 → 152 = 11 + 91 + 50 đo lại); sửa dòng "Gộp từ" tự tham chiếu; thêm `PROJECT_STATUS`, `FILE_INVENTORY`, `CLEANUP_REPORT`, `CLEANUP_CHANGELOG`. Không xoá file nào.
- Chi tiết: `docs/CLEANUP_REPORT.md`, `docs/CLEANUP_CHANGELOG.md`.

## V15.0.0-rc.0 (12/11/2026) — NOT PRODUCTION READY
Thay đổi so với V14 gốc (kết hợp phiên Commercial Edition trước):
- Build tương thích Windows (tools/build.mjs), scripts test/check/emulators thật, Node 22 (.nvmrc, engines, runtime nodejs22).
- Firebase không còn hardcode project người bán; Emulator dùng project giả demo-tkbc; thêm Pub/Sub Emulator (8085) cho 3 hàm scheduled.
- Client nối renameUser/createGuild/leaveGuild qua server; gỡ chốt mùa ở client.
- Rules hardened (firestore.rules.hardened) + bộ test rules (CHƯA chạy).
- Tài liệu: buyer deployment, local development, audit, license nháp.
Chưa làm: xem docs/commercial/READINESS_AND_ROADMAP.md và NEXT_TASKS.md.

### rc.0 bổ sung (12/11/2026)
- Thêm Cloud Functions: joinGuild, rollGacha, claimVideoQuizRound; client không còn ghi trực tiếp gia nhập Tông môn, gacha, thưởng ải video.
- Kết bạn / lời mời Tông môn chuyển sang subcollection (friends, friendRequests, guildInvites) khớp rules hardened; thêm functions/scripts/migrate-friends-requests.js (dry-run mặc định). Chưa chạy thử.
- Thêm kickGuildMember, transferGuildLeader, dissolveGuild, rate limiting (rateGate); UI Truyền Ngôi.
- Admin: Custom Claims + adminModerate + adminAudit; nút Xoá tài khoản; rules hardened siết ghi trực tiếp của admin.
- Quiz: dấu vân tay nội dung + cờ repeat_content (chỉ ghi nhật ký). Chấm điểm server chưa làm (xem WORK_LOG mục 21).
- Thêm tools/analyze-structure.mjs, docs/technical/STRUCTURE_REPORT.md; gỡ 3 import thừa trong App.jsx.
- Auth: xác minh email khôi phục (verifyBeforeUpdateEmail), đăng nhập/quên mật khẩu bằng email thật, bỏ lưu recoveryEmail công khai; script scrub-recovery-email.js.
- Thêm tests/integration (Emulator) và script npm run test:integration (chưa chạy).
- equipItem (trang bị server-side) + siết rules trang bị; test parity giá trị trang bị.
- Hồ sơ chuyển nhượng Phase 11 (ARCHITECTURE, FEATURE_MATRIX, due diligence, performance, cost, backup, roadmap, overview).
- Server tự khởi tạo meta/* cho mùa giải; client không còn ghi meta.
- Sắp xếp lại thư mục: gốc gọn hơn, docs chia nhóm + mục lục, gộp 22 file tài liệu nhỏ thành 8 file, README viết lại, thêm npm run docs:api / docs:structure.

## Modular refactor
- `src/App.jsx` 4.757 → 268 dòng; tách thành `src/app/` và `src/features/*` (hook + màn hình). Không đổi hành vi, không đổi Rules/Functions. Xem `docs/REFACTOR_REPORT.md`.
