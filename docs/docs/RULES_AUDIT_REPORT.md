# Audit Firestore Rules — Thiên Kiêu Bí Cảnh

Nguồn phân tích: `docs/firestore.rules`, `docs/README.md`, `docs/src/App.jsx`, `lib/srs.js`, `lib/userData.js`, `lib/moderation.js`, `config/gameData.js` trong zip.
Trạng thái kiểm chứng: **rules và test CHƯA được chạy** (môi trường không có mạng/emulator). Chỉ kiểm tra cú pháp JS của test và Functions. Phải chạy `npm run test:rules` trước khi tin vào kết quả.

## 1. Báo cáo lỗ hổng

| # | Lỗ hổng (rules cũ) | Cách khai thác | Mức | Tính năng bị ảnh hưởng khi sửa |
|---|---|---|---|---|
| 1 | `isOwner(uid)` cho sửa **toàn bộ** `users/{uid}` | Từ Console: `updateDoc(users/me, {spirit: 1e9, inventory:[...], rank:'...', usedCodes:[]})` | Nghiêm trọng | Mọi thưởng/mua sắm/chuỗi ngày đang ghi từ client |
| 2 | Nhánh `signedIn()` + `hasOnly(['spirit','fame'])` tăng ≤10000 | Lặp vô hạn, trên chính mình hoặc **người khác** | Nghiêm trọng | Thưởng cuối mùa chạy ở client |
| 3 | `seasonScore`/`seasonLessons`/`examPathDailyScore` về 0 bởi bất kỳ ai | Xoá điểm đối thủ trước giờ chốt mùa | Cao | Reset mùa client |
| 4 | `examPathTitles` sửa tuỳ ý bởi bất kỳ ai | Trao/ghi đè danh hiệu cho bất kỳ ai | Cao | Trao danh hiệu Đạo Lộ |
| 5 | `guild == null` bởi bất kỳ ai | Đuổi bất kỳ người nào khỏi tông môn | Cao | Trục xuất/giải tán |
| 6 | `guilds`: ai cũng sửa `members`,`exp`; `delete` khi `members.size()==0` | Tự tăng EXP; đặt `members=[]` rồi xoá tông môn người khác; thay danh sách thành viên | Nghiêm trọng | Tham gia/rời/EXP guild |
| 7 | `meta/*` ai cũng ghi `nextReset` | Đặt quá khứ → kích hoạt chốt mùa; đặt tương lai xa → mùa không bao giờ kết thúc | Cao | Đồng hồ mùa |
| 8 | `requests`: chỉ kiểm tra `size() >=` | Thay cả hộp thư của nạn nhân bằng mảng lớn hơn tuỳ ý (spam/phá) | Trung bình | Lời mời bạn/tông môn |
| 9 | `friends`: chỉ kiểm `hasAny([me])` và `size<=old+1` | Ghi đè danh sách bạn nạn nhân bằng `[me]` | Trung bình | Kết bạn |
| 10 | `videoShares.create` không giới hạn field; xoá chỉ admin; không có `owner` | Spam dữ liệu 1MiB; chủ không xoá được bài của mình | Trung bình | Chia sẻ video |
| 11 | `users.delete` cho chủ | Xoá rồi tạo lại hồ sơ để reset `usedCodes` (dùng lại mã quà), điểm mùa... | Cao | — (app không có chức năng xoá hồ sơ) |
| 12 | **Ngoài danh sách bạn nêu:** `GIFT_CODES` nằm trong bundle client (`config/gameData.js`), có mã `TRIEUQUOCDOANVIP` = 999.999.999 LT | Đọc source/`app.min.js` rồi nhập mã | **Nghiêm trọng** | Nhập mã quà |
| 13 | **Ngoài danh sách:** `users` đọc được bởi mọi người đăng nhập, gồm `library` (cả bộ đề), `recoveryEmail`, `friends`, `requests`, `usedCodes` | `getDocs(collection('users'))` | Trung bình (riêng tư) | Bảng xếp hạng cần đọc công khai |
| 14 | `reports`: admin update không kiểm trạng thái cũ, `reviewedBy/At` giả được | Admin (hoặc tài khoản admin bị chiếm) ghi nhãn sai | Thấp | Bảng quản trị |

Đã **đúng** ở rules cũ: `admins` không ghi được, `private/*` chỉ chủ, deny-all mặc định, `quizShares` update=false/list=false, `reports` create-only.

**Hành động ngay, độc lập với rules:** coi toàn bộ `GIFT_CODES` hiện tại là đã lộ → vô hiệu hoá, phát mã mới lưu ở `giftCodes/{CODE}` (server).

## 2. Nhóm 1 — Client được tự sửa (`users/{uid}`, đã thấy trong code)

`photo`, `bgImage`, `bio` (≤100), `theme`, `uiMode`, `appTheme`, `aura`, `nameColor`, `sfxPack` (chuỗi ngắn), `frame`/`nameFrame` (rỗng hoặc đã nằm trong `inventory`), `examPathActiveTitle` (rỗng hoặc đã nằm trong `examPathTitles`), `lastActive`, `library` (≤300), `videoNotes` (≤300), `examPath` (map), `examPathSaves` (≤10), `recoveryEmail` (≤254), `studySeconds` (chỉ tăng, ≤6h/lần).
Ngoài `users`: `private/*` + `srs/*` (chủ), `friendRequests`/`friends`/`guildInvites` (theo luật), `quizShares`/`videoShares` (create hợp lệ), `reports` (create-only), `guilds.notice` (bang chủ), tự tham gia/rời/trục xuất qua `members`.

## 3. Nhóm 2 — Chỉ backend/admin

`spirit`, `fame`, `seasonScore`, `seasonLessons`, `examPathDailyScore`, `examPathTitles`, `inventory`, `rank`, `buffs`, `x2BoostExpiresAt`, `dailyPurchases`, `usedCodes`, `streakCount`, `lastPlayedDate`, `streakRestorePending`, `name` (đổi tên tốn tiền), `gameId` (sau lần gán đầu), `currentSession`, mảng cũ `friends`/`requests` (đóng băng).
Guild: tạo guild, `level`, `exp`, `leader` (trừ chuyển quyền khi bang chủ rời), perk (`beast/aura/color/frame/bg...`), `name`, `guildId`.
`meta/*` (mọi mốc reset), `giftCodes/*`, `users/*/serverState/*`, `admins/*`.

## 4. File rules

`firestore.rules.hardened` (cùng thư mục) — mỗi nhánh có comment. Điểm chính:
- `users`: update = whitelist key + kiểm tra giá trị từng key; không có nhánh nào cho `spirit/fame/seasonScore/...`; `create` chỉ với giá trị khởi điểm; `delete=false`.
- Tự kiểm tra lại `signedIn()`/`isOwner()`: `signedIn()` chỉ còn xuất hiện cùng điều kiện chặt (đọc, `userGuildKickedByLeader` yêu cầu `leader == auth.uid`, `guildSelfJoin`...). `isOwner()` chỉ đi cùng `userCanEditProfile()` (whitelist), `userSetGameId`, `userHealStub` (chỉ về giá trị khởi điểm, chỉ hồ sơ không có `name`), `userGuildSelf`.
- Bạn bè: subcollection `users/{uid}/friendRequests/{fromUid}` và `users/{uid}/friends/{friendUid}`. Doc id = UID người gửi nên không thể sửa/xoá lời mời người khác; bản ghi bạn hai chiều chỉ tạo được khi người nhận đang giữ lời mời (`exists` đọc trạng thái trước batch).
- Guild: `create=false`; chỉ 4 kiểu update (`notice` bởi bang chủ; tự thêm đúng UID mình khi còn chỗ và chưa ở guild nào; tự bỏ đúng UID mình, bang chủ rời phải chuyển quyền cho người còn lại; bang chủ bỏ đúng 1 người khác); không thể làm `members` rỗng; chỉ bang chủ xoá.
- Giới hạn của Rules cần biết: không duyệt từng phần tử của `library`/`d` (câu hỏi) — chỉ kiểm tra kiểu + số lượng; lọc từ khoá (`isContentBlocked`) vẫn chỉ ở client → muốn ép phía server phải qua Function; chống tạo nhiều tài khoản để nhận quà tân thủ cũng không làm được bằng Rules.

## 5. Thay đổi client bắt buộc

1. Thay mọi `safeUserUpdate/syncUserData` có `spirit/fame/seasonScore/seasonLessons/examPathDailyScore/inventory/rank/buffs/usedCodes/streak*/dailyPurchases/x2BoostExpiresAt` bằng gọi callable (mục 6). Các dòng App.jsx: 517, 526, 1042–1082, 1245, 1371, 1453, 1531, 1588, 1609–1615, 2046–2065, 2292, 2451, 2935–2994, 479, 508, 532; `lib/srs.js` `flush()`.
2. Xoá khối reset mùa/Đạo Lộ/guild trong App.jsx dòng ~736–830 (thay bằng scheduled Functions); client chỉ đọc `meta/*`.
3. `GIFT_CODES`: xoá khỏi `gameData.js`; `importQuizCodeAction` gọi `redeemGiftCode`.
4. Bạn bè: `addFriendAction`, `addRandomFriendAction`, `sendFriendReqToUser` → `setDoc(users/{target}/friendRequests/{me}, {fromUid, fromName, type:'friend', createdAt: serverTimestamp()})`. `acceptFriendReq` → một `writeBatch`: tạo `users/me/friends/sender`, `users/sender/friends/me` (`{since: serverTimestamp()}`), xoá `users/me/friendRequests/sender`. `rejectReq` → xoá doc. Đọc danh sách từ subcollection (thay `user.friends`/`user.requests`). Cần script Admin SDK di trú mảng cũ → subcollection.
5. Mời tông môn: ghi `users/{target}/guildInvites/{guildName}` (chỉ bang chủ). Gia nhập: **đúng thứ tự** `guilds.update({members: arrayUnion(me)})` rồi `users/me.update({guild: name})` (như code hiện tại). Rời: `arrayRemove(me)` rồi `guild: null`. `leaveOrKickGuildAction` xoá nhánh `m !== user.name`; guild/leader cũ lưu **tên** thay vì UID phải di trú sang UID (rules chỉ hiểu UID).
6. `createGuild`, `upgradeGuildLevel`, `buyGuildPerk*`, `exchangeGuildExp`, phạt rời guild → callable. Notice vẫn ghi trực tiếp (client lọc từ khoá).
7. `videoShares`: thêm `owner: user.uid` vào payload ở `generateAndStoreVideoShareCode`; `createdAt` giữ `Date.now()`.
8. `quizShares`: không đổi. `reports`/`hiddenContent`: không đổi (đã dùng `serverTimestamp()`; `hideTarget` phải truyền `hiddenBy = admin uid` — đang đúng).
9. `name` chỉ tạo khi đăng ký; đổi tên → callable `renameUser`.

## 6. Thao tác chuyển sang Cloud Functions (khung code: `functions/index.js`)

| Thao tác | Callable/Job | Ghi chú |
|---|---|---|
| Thưởng quiz + điểm mùa + EXP guild + Đạo Lộ | `claimQuizReward` | Server không biết đúng/sai thật → trần/ngày, giãn cách, tự tính công thức |
| Thưởng đăng nhập/chuỗi ngày | gộp trong `claimQuizReward` + `restoreStreak` | Port `calculateStreak` (lib/progress.js) |
| Thưởng video (lưu bài, ải ôn tập) | `claimVideoReward`, `claimVideoQuizRound` | Chống nhận trùng bằng `serverState/videoClaims` |
| Thưởng SRS | `claimSrsReward` | Trần cứng mỗi lần |
| Mã quà | `redeemGiftCode` | Mã ở `giftCodes/` |
| Mua vật phẩm/trừ tiền/dùng bùa | `purchaseItem`, `activateBuff`, `rename`, `buyRank` | Bảng giá ở server |
| Thưởng + reset mùa | `finalizeSeason` (lịch) | Thay đoạn client 736–800 |
| Trao danh hiệu + reset Đạo Lộ | `finalizeExamPathDaily` (lịch 4h VN) | |
| Thưởng guild theo mùa, tăng EXP guild | `finalizeGuildSeason`, trong claim* | |
| Tạo/nâng cấp/perk/đổi EXP guild, phạt rời | `createGuild`, `upgradeGuild`, `buyGuildPerk`, `exchangeGuildExp`, `leaveGuild` | Rules cho phép tự rời **không phạt**; muốn ép phạt hãy bỏ nhánh `guildSelfLeave` và dùng `leaveGuild` |

Cần gói Blaze; thêm SDK `firebase-functions-compat.js` vào `index.html` và `firebase.functions('asia-southeast1').httpsCallable(...)`. Bật App Check. Không có service-account trong client (Admin SDK chạy trong Functions).

## 7. Test

`tests/firestore.rules.test.mjs`: đủ 10 case bị từ chối + 6 case được phép như yêu cầu, cộng các case bổ sung (hồ sơ giàu, xoá hồ sơ, giftCodes, mạo danh friend request, report/hiddenContent, giải tán guild).

## 8. Lệnh chạy

```bash
cd hardening
npm install              # cần Java 11+ cho emulator
npm run test:rules       # = firebase emulators:exec --only firestore "node --test tests/"
```

## 9. Checklist triển khai / rollback

1. Sao lưu: `gcloud firestore export` + lưu `firestore.rules` hiện tại (`firebase firestore:rules` hoặc Console → Rules → History).
2. Vô hiệu hoá `GIFT_CODES` cũ; tạo `giftCodes/` mới; tạo `meta/season|guildSeason|examPathDaily` (`nextReset`) bằng Admin SDK.
3. Chạy test rules trên emulator, sửa các case lệch do chưa kiểm chứng.
4. Deploy Functions lên project **staging**, đổi client sang callable, chạy tay: quiz, video, mã quà, mua đồ, kết bạn, guild (tham gia/rời/trục xuất/giải tán), kết thúc mùa.
5. Script di trú: `friends/requests` mảng → subcollection; guild `members/leader` tên → UID; thêm `owner` cho videoShares cũ nếu muốn cho chủ xoá.
6. Chạy `rules` trên staging với app thật; xem log permission-denied (field ghi mà whitelist thiếu → thêm vào whitelist **chỉ khi** field không mang tiền/điểm/quyền).
7. Deploy client + Functions + rules **cùng lúc** lên production (rules trước client mới sẽ làm hỏng thưởng/mua).
8. Rollback: `firebase deploy --only firestore:rules` với file cũ (hoặc khôi phục từ Rules History); client cũ + rules cũ hoạt động lại ngay (Functions để nguyên).
9. Sau deploy: giám sát `serverState/rewards` và số lượng `permission-denied`.

## 10. TODO (thiếu schema/source)

- `GIFT_CODES`, `RANKS`, `BUFF_DEFS`, bảng giá shop, `EXAM_PATH_TITLES`, `LB_MIN_LESSONS` thật → điền vào `functions/index.js` (đã đánh dấu TODO).
- Giá trị hợp lệ của `theme/uiMode/appTheme/aura/nameColor/sfxPack`: hiện chỉ kiểm tra chuỗi ngắn; `aura`/`nameColor`/`appTheme`/`sfxPack` lưu `class/color` chứ không phải id vật phẩm nên chưa kiểm tra quyền sở hữu được → cần bảng ánh xạ.
- `studySeconds` có đi vào bảng xếp hạng nào không? Nếu có → chuyển sang backend.
- `currentSession`: chỉ thấy lệnh xoá (App.jsx:1048); chưa thấy nơi ghi → nếu client ghi, thêm vào whitelist.
- Giới hạn kích thước `photo/bgImage` (350.000 ký tự) có thể thấp hơn ảnh nén thực tế của app — kiểm tra `compressImage`.
- Tên dành riêng (`isReservedName`) và lọc từ khoá chỉ ở client; tính duy nhất của `name` chưa có (nên thêm `usernames/{name}` do Function giữ).
- Tách dữ liệu riêng tư (`library`, `recoveryEmail`, `usedCodes`) sang `users/{uid}/private/*` để không bị mọi người đọc.
- Hồ sơ `users` hiện còn field lạ ngoài những gì thấy trong code → quét Firestore thật.
- `summary` của `videoShares` có thể là chuỗi hoặc object → hiện chỉ kiểm tra có mặt.
- Rate limit tạo `friendRequests`/`quizShares` hàng loạt: Rules không đếm được → App Check + Function nếu bị spam.
