# API_DOCUMENTATION — Cloud Functions

> Sinh TỰ ĐỘNG từ `functions/index.js` bằng `tools/gen-api-docs.mjs` (đọc tĩnh, có thể sót/nhầm trường đầu vào — luôn đối chiếu code). Region: `asia-southeast1`. 28 hàm.

Giao thức: Firebase callable (`httpsCallable(functions, 'tên')`); client gửi `{ ... }`; phản hồi `{ result }` hoặc lỗi `{ error:{ status, message } }`. Hàm ghi tiền tệ/vật phẩm/phần thưởng dùng `requestId` (idempotent: gọi lại cùng requestId trả kết quả cũ, không áp dụng hai lần).

## Callable

| Hàm | Quyền | Idempotent | Giới hạn tần suất (rateGate) | Trường đầu vào (suy ra từ code) | Ghi chú trong code |
|---|---|---|---|---|---|
| `startQuiz` | Người dùng đã đăng nhập | không | 60/600s (startQuiz) | `total`, `fingerprint` | ===== Quiz: startQuiz (phát phiên 1 lần) + claimQuizReward ===== |
| `claimQuizReward` | Người dùng đã đăng nhập | có (requestId) | — | `sessionId`, `correct`, `examPath` | KHÔNG tin số tiền/điểm từ client. `correct` do client khai KHÔNG kiểm chứng được (đề/đáp án nằm ở client, kể cả đề cá nhân/AI) => lượt học được đánh dấu verified:false, bị giới hạn: phiên 1 lần, thời lượng tối thiểu, trần LT/DV mỗi ngày. |
| `claimVideoReward` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `link` | ===== Thưởng lưu bài học video (lần đầu mỗi link) ===== |
| `claimSrsReward` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `spirit`, `fame`, `ct` | ===== Thưởng ôn SRS: trần cứng mỗi lần (client khai báo, KHÔNG kiểm chứng được) ===== |
| `redeemGiftCode` | Người dùng đã đăng nhập | có (requestId) | — | `code` | ===== Mã quà: giftCodes/{CODE} = { s, f, maxUses?, uses, disabled? } — client không đọc được ===== |
| `claimVideoQuizRound` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `total`, `score` | ===== Ải ôn tập video: máy chủ tính thưởng (rank/x2/buff), giới hạn theo ngày, chống gọi lặp ===== GIỚI HẠN THỰC TẾ: ải do client dựng từ bản dịch của người dùng nên server không thể kiểm chứng số câu đúng; chỉ chặn bằng: total<=6, mỗi requestId một lần, trần Linh Thạch/Danh Vọng mỗi ngày (LIMITS). |
| `equipItem` | Người dùng đã đăng nhập | không | 60/60s (equip) | `slot`, `itemId` | ===== Trang bị / tháo trang bị: server kiểm tra sở hữu, client không tự ghi các trường trang bị khác rỗng ===== |
| `purchaseItem` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `itemId` | ===== Cửa hàng ===== |
| `buyRank` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `rankId` | — |
| `activateBuff` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `itemId` | Kích hoạt bùa từ túi đồ (buff theo giờ hoặc Bùa Nhân Đôi) |
| `renameUser` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `name` | ===== Đổi tên (1000 LT + 100 DV), giữ tính duy nhất qua usernames/{name} ===== |
| `rollGacha` | Người dùng đã đăng nhập | có (requestId) | 20/60s (gacha) | `requestId` | ===== Gacha: server sinh số ngẫu nhiên, trừ phí và trao thưởng trong một transaction ===== |
| `createGuild` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `name` | — |
| `joinGuild` | Người dùng đã đăng nhập | có (requestId) | 10/60s (joinGuild) | `requestId`, `guild`, `inviteId` | — |
| `leaveGuild` | Người dùng đã đăng nhập | có (requestId) | — | `requestId` | — |
| `kickGuildMember` | Người dùng đã đăng nhập | có (requestId) | 30/60s (guildAdmin) | `requestId`, `targetUid` | — |
| `transferGuildLeader` | Người dùng đã đăng nhập | có (requestId) | 30/60s (guildAdmin) | `requestId`, `targetUid` | — |
| `dissolveGuild` | Người dùng đã đăng nhập | có (requestId) | — | `requestId` | — |
| `upgradeGuild` | Người dùng đã đăng nhập | có (requestId) | — | `requestId` | — |
| `buyGuildPerk` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `perkType`, `value` | — |
| `exchangeGuildExp` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `offerId` | — |
| `restoreStreak` | Người dùng đã đăng nhập | có (requestId) | — | `requestId`, `method` | ----- Khôi phục chuỗi điểm danh ----- |
| `deleteAccount` | Người dùng đã đăng nhập | không | — | `confirm`, `ref` | ===== Xoá tài khoản ===== |
| `adminModerate` | Admin | không | — | — | ===== Kiểm duyệt (admin): ẩn / khôi phục / bỏ qua báo cáo; MỌI thao tác ghi nhật ký adminAudit (chỉ server ghi) ===== |
| `getResearchStats` | Admin | không | — | `data`, `id` | — |

## Hàm theo lịch (không gọi từ client)

| Hàm | Lịch |
|---|---|
| `finalizeSeason` | every 5 minutes |
| `finalizeGuildSeason` | every 30 minutes |
| `finalizeExamPathDaily` | every 10 minutes |

## Lỗi thường gặp
`UNAUTHENTICATED` (chưa đăng nhập), `PERMISSION_DENIED` (không đủ quyền, ví dụ không phải Bang Chủ/admin), `INVALID_ARGUMENT` (đầu vào sai), `FAILED_PRECONDITION` (điều kiện nghiệp vụ không thoả: thiếu tiền, chưa sở hữu...), `RESOURCE_EXHAUSTED` (quá giới hạn tần suất).

## Giới hạn đã biết
- Điểm Quiz/ải video do client khai (đề nằm ở client) nên server chỉ giới hạn bằng trần/ngày, thời lượng tối thiểu, cờ bất thường (xem docs/KNOWN_ISSUES.md).
- Tài liệu này chưa được kiểm chứng bằng cách gọi thật qua Emulator (xem tests/integration).
