# Known issues / CHƯA HOÀN THÀNH (trạng thái thật của V13-WIP)
Bản này KHÔNG production-ready. Chưa triển khai staging/production.

| Hạng mục | Trạng thái |
|---|---|
| `npm ci` / `npm run build` / Tailwind build-time | CHƯA CHẠY (không có mạng); chưa có package-lock.json |
| Firestore Rules mới (`firestore.rules.hardened`) | Đã viết; CHƯA chạy emulator. `firestore.rules` vẫn là bản V11 để app hiện tại không hỏng |
| Rules tests (`tests/rules`) | Đã viết; CHƯA chạy |
| Cloud Functions (`functions/`) | Đã viết cho: startQuiz, claimQuizReward, claimVideoReward, claimSrsReward, redeemGiftCode, purchaseItem, buyRank, activateBuff, renameUser, createGuild, leaveGuild, deleteAccount, finalizeSeason/GuildSeason/ExamPathDaily, getResearchStats. CHƯA chạy emulator/staging. Unit test logic thuần: 10/10 pass |
| Chưa viết | upgradeGuild, buyGuildPerk, exchangeGuildExp, restoreStreak, claimDailyReward, useItem, claimVideoQuizRound; streak + Đạo Lộ (examPath*) trong claimQuizReward; dọn bản ghi bạn bè đối xứng khi deleteAccount; lọc từ khoá phía server |
| Chống gian lận Quiz | Server KHÔNG kiểm chứng được đúng/sai (đề ở client). Đã có phiên 1 lần, thời lượng tối thiểu, trần ngày, đánh dấu verified:false. Chấm điểm thật cần lưu đề/đáp án phía server |
| Nối client | Đã nối: mã quà, mua đồ (kể cả âm thanh), kích hoạt bùa/Nhân Đôi, đột phá cảnh giới. Còn lại 39 `safeUserUpdate` / 24 `FieldValue.increment` (xem docs/technical/SECURITY_AUDIT.md) vẫn ghi trực tiếp: thưởng quiz/video/SRS/ải video, mua đồ, đột phá, bùa, đổi tên, tạo/rời/nâng cấp Tông Môn, reset mùa ở client. Không bật hardened rules trước khi nối xong |
| Shop | Giá lấy từ gameData.js V11. Client có `currencyType` (có thể trả bằng Danh Vọng) — server hiện chỉ trừ Linh Thạch; định dạng `dailyPurchases` server khác client |
| Rules: tự rời guild | Rules cho rời không phạt; để ép phạt 500 LT hãy bỏ nhánh `guildSelfLeave` và dùng `leaveGuild` |
| Auth (email giả sau đổi email, xác minh, xoá tài khoản) | CHƯA sửa |
| Research Dashboard | Function có; `ResearchDashboard.jsx` CHƯA nối. Chỉ số newUsers/growth/retention/completionRate/monthly CHƯA thu thập |
| Tách App.jsx, E2E, GitHub Actions, các tài liệu INSTALLATION/FIREBASE_SETUP/SECURITY/DATA_MIGRATION/ADMIN_GUIDE/BUYER_HANDOVER | CHƯA làm |
| Migration | Chưa có script di trú friends/requests → subcollection, guild tên → UID, publicProfiles |


## Cập nhật V13.1 (phiên này)
- Đã xác minh trên code: lệch region (Dashboard `us-central1` vs backend `asia-southeast1`) -> ĐÃ thống nhất qua `src/config/functionsConfig.js` + `functions/lib/config.js` + test `region.test.js`. Region thật của project đang chạy CHƯA kiểm tra được (không có quyền Firebase).
- GIFT_CODES đã xoá khỏi bundle; mã cũ phải coi là lộ. Dữ liệu mã mới nằm ở `giftCodes/` (có `expiresAt`, `maxUses`, `usedCodes` mỗi tài khoản).
- `getResearchStats` đã sửa theo đúng hợp đồng dữ liệu của ResearchDashboard (trước đó trả sai định dạng nên dashboard sẽ hiển thị sai). CHƯA chạy thật.
- Rules: một file deploy duy nhất `firestore.rules` (V11, còn lỗ hổng) + file đích `firestore.rules.hardened` + lệnh kích hoạt. Quyết định này là có chủ ý để app hiện tại không hỏng.
- App.jsx đã sửa ở 1 khối + 1 import; KHÔNG có trình biên dịch JSX trong môi trường này nên chưa kiểm tra cú pháp bằng build (chỉ kiểm tra cân ngoặc thô). Bắt buộc chạy `./build.sh` trước khi dùng.
- Chưa làm: chấm điểm quiz phía server, upgradeGuild/buyGuildPerk/exchangeGuildExp/restoreStreak/claimDailyReward/useItem/joinGuild/kick/transferLeader, Custom Claims admin, Auth (email giả), migration publicProfiles/subcollection, tách module functions theo cây thư mục đề xuất, lockfile, E2E, tài liệu buyer đầy đủ.

## Cập nhật tối ưu lần 2
- Nối thêm `purchaseItem`, `activateBuff`, `buyRank` vào App.jsx (không có nhánh dự phòng ghi client; có khoá chống bấm đúp `buyingRef`). Định dạng `dailyPurchases` server khớp client (`{date,count,x2,b}`).
- Thêm `functions/test/catalog-sync.test.mjs`: so catalog server với `gameData.js` (giá, định danh, cảnh giới, buff, danh hiệu) — 8/8 pass.
- Dashboard & Gift: như trên. CẦN: build + chạy tay các luồng mua/bùa/đột phá trên staging; `buyRank` mirror công thức DV `-reqFame+100` của client.
- Lưu ý hành vi: mua bằng Danh Vọng (`currencyType='fame'`) KHÔNG được server hỗ trợ; hiện không có nút nào dùng.

## Cập nhật lần 3: luồng Quiz
- `startQuiz` được gọi lúc vào Ải (`startFreshQuiz`); khi xong Ải `continueAfterAnswer` gọi `claimQuizReward` — client KHÔNG còn tự cộng LT/DV/điểm mùa/chuỗi/Đạo Hữu Bảng/EXP Tông Môn và không có nhánh dự phòng. Lỗi mạng/máy chủ => báo lỗi, không có thưởng (tiến độ Đạo Lộ vẫn lưu).
- Server tự tính: thưởng (công thức y hệt client), chuỗi điểm danh (có cờ `streakRestorePending`), điểm Đạo Hữu Bảng theo đồng hồ server + khung 4h–23h VN. Test parity client↔server: 4/4 pass.
- VẪN KHÔNG chống được `correct` bị khai gian (đề/đáp án ở client): lượt học có `verified:false`, phiên dùng 1 lần, thời lượng tối thiểu 2s/câu, trần LT 30000/ngày và DV 1500/ngày. Cần lưu đề + đáp án phía server nếu muốn chấm thật.
- `examPath` (tiến độ nút/mở khoá Ải) vẫn do client ghi (nội dung cá nhân, không mang tiền). Rủi ro: client có thể tự đánh dấu nút 'done'; đã tách khỏi điểm Đạo Hữu Bảng.
- Còn 38 `safeUserUpdate` / 20 `increment`.

## Cập nhật lần 4
- Nối `claimVideoReward` (lưu bài học video) và `claimSrsReward` (flush SRS, lô có requestId lưu trong `S.pend.inflight`). Số liệu thưởng SRS do client khai => chỉ có trần/lần (5000 LT, 500 DV, 100 EXP) + trần/ngày chung với Quiz (30000 LT, 1500 DV); SRS CHƯA có giãn cách tối thiểu.
- Cần thử tay trên staging: lưu video lần đầu/lần hai, ôn thẻ rồi tắt mạng giữa chừng.
- Còn 38 `safeUserUpdate` / 19 `increment` trong App.jsx.

## Cập nhật V14 phần 1
- Thêm server + nối client: `upgradeGuild`, `buyGuildPerk`, `exchangeGuildExp`, `restoreStreak`. Catalog perk lấy từ gameData (`functions/lib/guild-catalog.json`, có test đối chiếu); giá/quyền do server. Giới hạn: bang chủ cũ lưu bằng TÊN (không phải UID) sẽ bị server từ chối — cần migration guild.leader/members sang UID trước khi dùng.
- Sửa chốt mùa: `lib/checkpoint.js` — cursor ghi cùng batch với thưởng; `nextReset` chỉ đẩy lên khi xong; chụp bảng xếp hạng một lần.
- Không tạo `claimDailyReward`, `useItem`: client không có tính năng tương ứng (đã có `activateBuff`, chuỗi nằm trong `claimQuizReward`). `claimVideoQuizRound` CHƯA làm.
- `createGuild`/`leaveGuild` đã có ở server nhưng CLIENT CHƯA NỐI.
- Còn 31 `safeUserUpdate` / 12 `increment` trong App.jsx.

## Cập nhật 2026-11-12 (Commercial Edition, phiên offline)
- Đã sửa: build phụ thuộc `sh` (nay `node tools/build.mjs`); bundle lệch `src/` (đã build lại, `npm run build:check`); thiếu script test:all/check/emulators; Node 20 (đã decommission) → 22; hardcode project người bán trong `src/config/firebase.js`/`.env.example`; client tự chốt mùa/Tông môn/Đạo Hữu Bảng (gỡ); đổi tên/tạo/rời Tông môn đã nối server.
- Vẫn mở: lockfile (BLOCKED), npm audit (BLOCKED), Emulator + rules tests (NOT VERIFIED), gacha/ải video/gia nhập Tông môn ghi từ client, quiz chấm phía server, Auth/Admin claims/App Check, tách App.jsx, UI/UX, E2E, demo. Xem `docs/history/FULL_SYSTEM_AUDIT.md`, `docs/NEXT_TASKS.md`.
- Hệ quả của gỡ reset mùa ở client: thưởng mùa chỉ phát khi Cloud Functions `finalize*` đã deploy; popup `seasonRewardModal`/`examPathRewardModal` không còn được bật từ client (chưa có thông báo thay thế).
