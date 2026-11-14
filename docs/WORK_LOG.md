# WORK_LOG
## 2026-11-12 — phiên Commercial Edition (offline sandbox, Node 22)
1. Giải nén zip gốc (giữ nguyên bản upload làm backup). Không có `.git` trong zip.
2. Đối chiếu báo cáo cũ với source: xem `docs/archive/FULL_SYSTEM_AUDIT_V14.md`. Phát hiện: preflight/make-lockfiles không tồn tại; bundle cũ lệch `src/`; thiếu script test:all/check/emulators.
3. Build: thêm `tools/build.mjs` (esbuild API, `--check`), `tools/run-tests.mjs`, `tools/preflight.mjs`; sửa scripts `package.json`. Bằng chứng: build + build:check exit 0.
4. Node: `.nvmrc`=22, engines root/functions, `firebase.json` `runtime: nodejs22`. Nguồn: tài liệu runtime của Google (Node 20 decommission 2026-10-30).
5. Emulator: `firebase.json` (+hosting, indexes), `firebase.emulator-full.json` (hardened rules), `tools/seed-emulator.mjs` + `tests/fixtures/emulator-seed.json`, `docs/guides/LOCAL_DEVELOPMENT.md`. KHÔNG chạy được.
6. Buyer: `src/config/firebase.js` không còn hardcode project người bán (đọc `js/firebase-config.js`; Emulator tự nhận); `.firebaserc.example`, `.env.example`, `js/firebase-config.example.js`, guide.
7. Lỗi do chính phiên này gây ra rồi sửa: `firebase.js` dùng `location` làm hỏng `tests/moderation.test.mjs` (7/8) → thêm bảo vệ ngoài trình duyệt → 11/11.
8. Client: nối `renameUser`, `createGuild`, `leaveGuild`; gỡ chốt mùa/Tông môn/Đạo Hữu Bảng ở client (server `finalize*` đảm nhiệm). Còn 28 `safeUserUpdate` + 5 `increment`.
9. Test cuối: root 11/11, frontend 90/90, functions 33/33; check-globals OK; bundle đồng bộ.
10. KHÔNG làm được: npm ci/lockfile/audit, Emulator, rules tests, browser/E2E, deploy.

## 2026-11-12 (phiên tiếp, theo kế hoạch cập nhật)
11. Đối chiếu ảnh CMD Windows: Auth/Firestore/Functions/UI READY; Pub/Sub thiếu → 3 scheduled Functions bị bỏ qua. Nguyên nhân: cấu hình không khai báo `pubsub`. Đã thêm `pubsub` 127.0.0.1:8085 vào `firebase.emulator-full.json` và `firebase.json`. CHƯA chạy lại trên Windows.
12. Project ID `thienbicanhmong` trong CMD: grep source không thấy hardcode trong client/functions/config; nghi do chạy `firebase emulators:start` không có `--project` (lấy từ `.firebaserc`/`firebase use` trên máy). `npm run emulators` đã ép `demo-tkbc`. Ghi hướng dẫn kiểm tra vào docs/FIREBASE_LOCAL_DEVELOPMENT.md.

## 2026-11-12 (phiên 3) — server-side P0
13. joinGuild: server kiểm tra sức chứa (cấp*5), đã có môn phái, trùng thành viên; xoá lời mời; idempotent. Nối 3 chỗ client (mã/tên, danh sách, nhận lời mời).
14. rollGacha: server sinh số (crypto.randomInt), trừ 200 LT + trao thưởng trong transaction; giữ tỉ lệ cũ. Client chỉ gọi.
15. claimVideoQuizRound: server tính thưởng bằng quizReward + trần ngày + idempotent. GIỚI HẠN: ải do client dựng nên điểm không kiểm chứng được; chỉ hạn chế bằng trần và requestId.
Test functions 36/36 PASS. Client chưa build lại (sandbox không có esbuild): CHƯA kiểm chứng bundle/JSX.

## 2026-11-13 — phát hiện lệch mô hình dữ liệu giữa client và rules hardened
16. Rà 23 safeUserUpdate: 21 là dữ liệu cá nhân/trình bày (library, videoNotes, examPath*, photo/bio, recoveryEmail, sfxPack, studySeconds, guild:null dọn dẹp) nằm trong whitelist rules; không phải kinh tế. Riêng `sfxPack` ghi sau purchaseItem (rules cho phép).
17. PHÁT HIỆN: rules hardened dùng subcollection friends/friendRequests/guildInvites, còn client dùng mảng friends/requests và GHI CHÉO vào hồ sơ người khác -> bật hardened sẽ làm hỏng kết bạn/mời Tông môn. Đã sửa client: gửi/nhận/từ chối lời mời kết giao, mời Tông môn, listener đọc subcollection; joinGuild xoá guildInvites. Viết functions/scripts/migrate-friends-requests.js (dry-run mặc định). CHƯA chạy thử, CHƯA build (không có esbuild/Emulator).
18. Còn lệch chưa xử lý: client tự ghi meta/season, meta/guildSeason, meta/examPathDaily (seasonDocRef.set); leader/members của Tông môn cũ có thể lưu theo TÊN thay vì UID; notice Tông môn, kick/chuyển trưởng môn chưa kiểm chứng với rules. Chưa kích hoạt rules hardened.

## 2026-11-13 (theo docx kế hoạch: Phase 7/8)
19. Server: kickGuildMember, transferGuildLeader, dissolveGuild (quyền Bang Chủ lấy từ guild.leader trên server; tương thích leader lưu theo tên cũ), rateGate (giới hạn tần suất) cho rollGacha/joinGuild/kick/transfer. Client nối kick, giải tán, thêm nút Truyền Ngôi. Test functions 38/38 (chỉ logic thuần). CHƯA chạy Emulator/Rules test, CHƯA build.

20. Admin: Custom Claim `admin` (functions/scripts/grant-admin.js), requireAdmin phía server, adminModerate (hide/unhide/dismiss) ghi adminAudit; client moderation.js gọi server; rules hardened: isAdmin nhận claim, hiddenContent/reports không ghi trực tiếp, adminAudit chỉ admin đọc; test rules cập nhật (ALLOW 4). Nối deleteAccount vào UI (gõ XOA). Test: 11 + 90 + 41 PASS (logic thuần). Rules test/Emulator/build: CHƯA chạy. TODO: dọn bản ghi friends đối xứng khi xoá tài khoản.

21. Quiz: KẾT LUẬN — chấm điểm phía server KHÔNG khả thi có ý nghĩa với đề do người dùng/AI/DOCX tạo (đáp án ở client; quizShares chứa đáp án, ai đăng nhập cũng đọc). Không tạo hàm chấm giả. Đã làm phần khả thi: quizFingerprint (client) -> startQuiz lưu fp -> claimQuizReward đếm lặp theo ngày (repeatPlan) và ghi cheatFlags 'repeat_content' khi >8 lần/ngày (CHỈ ghi nhật ký, không đổi thưởng). Test 11 + 91 + 43 PASS. Cần chủ dự án quyết định hướng: ngân hàng câu hỏi nền tảng ở server hay chấp nhận verified:false.

22. Phase 9 (đo thật): tools/analyze-structure.mjs -> docs/STRUCTURE_REPORT.md. Kết quả: 94 file JS/JSX, 11.283 dòng; 0 file trùng; 0 vòng import; không file mồ côi (trừ entry main.jsx); App.jsx 4.753 dòng (chưa tách). Gỡ 3 import thừa trong App.jsx (seasonRewardFor, calculateStreak, generateGuildId). js/app.min.js trong gói là bản BUILD CŨ (489.117 byte, ~131 KB gzip) — chưa build lại sau các sửa client; phải chạy npm run build. Test 11 + 91 + 43 PASS.

23. Auth (đọc code, CHƯA chạy): (a) LỖI: handleLinkRecoveryEmail dùng updateEmail làm email đăng nhập đổi sang email thật, nhưng đăng nhập luôn ghép <đạo hiệu>@thienkieu.com => sau khi gắn email, đăng nhập bằng Đạo Hiệu + Mật Mã bị khoá. (b) LỖI quyền riêng tư: recoveryEmail lưu trong users/{uid} mà mọi người đã đăng nhập đều đọc được (listener toàn bộ users). (c) LỖI: Quên Mật Khẩu ở màn Đăng Nhập tra allUsers, nhưng allUsers chỉ nạp sau khi đăng nhập => luôn rỗng. Đã sửa: verifyBeforeUpdateEmail (xác minh email), đăng nhập được bằng email thật gõ vào ô Đạo Hiệu, Quên Mật Khẩu gửi thẳng tới email gõ vào, không còn ghi/đọc recoveryEmail ở Firestore, rules hardened bỏ recoveryEmail; thêm functions/scripts/scrub-recovery-email.js (dry-run). Chưa sửa: đăng ký vẫn do client tạo hồ sơ khởi đầu (500 LT/100 DV, rules hardened kiểm giá trị), mật khẩu tối thiểu 6 (mặc định Firebase), không có xác minh email bắt buộc khi đăng ký, kiểm tra trùng tên dựa vào email giả duy nhất của Auth.

24. Phase 13: thêm tests/integration/functions.emulator.test.mjs (9 test, HTTP callable + firebase-admin, script npm run test:integration). CHƯA CHẠY (sandbox không có Emulator). Unit test 11 + 91 + 43 = 145 PASS (chạy lại 13/11).

25. Trang bị: PHÁT HIỆN rules hardened chỉ kiểm sở hữu cho frame/nameFrame; aura, nameColor, appTheme, sfxPack chỉ kiểm độ dài chuỗi => có thể tự trang bị vật phẩm cao giá chưa mua (aura 99999 LT...). Đã làm: functions/lib/equip.js + hàm equipItem (ô, sở hữu, giá trị từ catalog; màu tên lưu mã màu, hào quang lưu class), client dùng equip() cho 6 ô, rules hardened chỉ cho client tháo (chuỗi rỗng), test rules cập nhật, 5 unit test + test parity giá trị trang bị với gameData + 1 integration test. Unit test 11 + 91 + 49 = 151 PASS. CHƯA chạy Emulator/Rules test/build. Lưu ý: aura_laoma tự kích hoạt theo inventory (common.jsx), không qua equipItem.

26. Phase 11: viết docs/ARCHITECTURE, FEATURE_MATRIX, TECHNICAL_DUE_DILIGENCE, PERFORMANCE_REPORT, SERVICE_COST_ESTIMATE, BACKUP_RESTORE, COMMERCIAL_ROADMAP, PRODUCT_OVERVIEW; chạy lại tools/gen-api-docs.mjs (docs/technical/API_DOCUMENTATION.md khớp code). Mọi tài liệu ghi rõ: chưa kiểm chứng bằng Emulator, không có số liệu doanh thu/chi phí/người dùng. Phát hiện kiến trúc: client nghe toàn bộ users/guilds (nghẽn mở rộng + riêng tư).

27. Phase 7: ánh xạ 7 mục 'tấn công rules' sang test sẵn có trong tests/rules (+1 test mới: trang bị khác rỗng và recoveryEmail bị chặn). CHƯA chạy (npm run test:rules).

28. 13/11/2026 ảnh Emulator UI từ Windows: Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, Pub/Sub 8085 BẬT (Realtime DB/Storage tắt). Xác nhận cấu hình Pub/Sub hoạt động ở mức khởi động; CHƯA xác nhận 3 hàm lịch được nạp. Chưa có kết quả test:rules / test:integration.

29. P0 rules hardened: client vẫn tự tạo meta/season, meta/guildSeason, meta/examPathDaily nếu thiếu, còn runCheckpointed của server bỏ qua khi thiếu nextReset => bật rules hardened (meta write:false) sẽ làm mùa giải KHÔNG BAO GIỜ chốt. Đã sửa: runCheckpointed tự khởi tạo nextReset khi thiếu/hỏng (không phát thưởng), client chỉ đọc meta; gỡ 3 import thừa (GUILD_SEASON_DURATION, SEASON_DURATION, getNextExamPathResetTs). Test functions 50/50 (tổng 11 + 91 + 50 = 152). Sau khi triển khai lần đầu, mốc meta xuất hiện sau tối đa 5–30 phút (hoặc chạy functions/scripts/seed-meta-and-gifts.js). CHƯA chạy Emulator.

30. 13/11/2026 — Sắp xếp lại thư mục theo yêu cầu "gọn gàng, ít file nhỏ": thư mục gốc 38 -> 26 mục (chuyển 10 file .md/.v11 và 3 thư mục add-on cũ vào docs/history/); docs/ chia 5 nhóm (guides, technical, commercial, legal, history) + mục lục docs/README.md; gộp 22 file tài liệu nhỏ thành 8 file có tên rõ (dòng đầu mỗi file ghi nguồn gộp); README gốc viết lại (bản cũ còn ghi V14 và "23 test"); sửa mọi tham chiếu (22 file), bỏ mục ignore của thư mục đã chuyển trong firebase.json; thêm .gitignore cho log chạy local; thêm npm run docs:api và docs:structure. Kiểm chứng: 152/152 unit test PASS, preflight không đổi so với trước (chỉ còn thiếu lockfile/node_modules), 0 link .md hỏng, 0 tham chiếu cũ còn sót, API doc khớp bản sinh lại. KHÔNG đổi mã nguồn ứng dụng; bản sao lưu trước khi sắp xếp: V15_backup_before_tidy (ngoài gói zip).

31. 14/11/2026 — Đợt dọn dẹp & chuẩn hoá V15 (xem `docs/CLEANUP_REPORT.md`, `docs/CLEANUP_CHANGELOG.md`). Backup ZIP gốc (SHA-256 `3169f8dd…`). Phát hiện `js/app.min.js` lệch `src/` → build lại (esbuild 0.28.2). Chạy lại: unit 11/91/50 = 152 PASS; check:globals PASS; build:check PASS; preflight 2 FAIL (lockfile); test:rules và test:integration BLOCKED. `docs/history/` → `docs/archive/`. Không xoá file, không deploy, không tạo lockfile (không có mạng).

