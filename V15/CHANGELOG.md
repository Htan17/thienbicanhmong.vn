# CHANGELOG
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
