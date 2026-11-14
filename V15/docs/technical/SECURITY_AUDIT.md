# Kiểm toán bảo mật (rules, ghi từ client, phụ thuộc)
> Gộp từ: docs/technical/SECURITY_AUDIT.md, docs/technical/SECURITY_AUDIT.md, docs/technical/SECURITY_AUDIT.md (13/11/2026, sắp xếp lại thư mục).

## Audit Firestore Rules — Thiên Kiêu Bí Cảnh

Nguồn phân tích: `docs/firestore.rules`, `docs/README.md`, `docs/src/App.jsx`, `lib/srs.js`, `lib/userData.js`, `lib/moderation.js`, `config/gameData.js` trong zip.
Trạng thái kiểm chứng: **rules và test CHƯA được chạy** (môi trường không có mạng/emulator). Chỉ kiểm tra cú pháp JS của test và Functions. Phải chạy `npm run test:rules` trước khi tin vào kết quả.

### 1. Báo cáo lỗ hổng

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

### 2. Nhóm 1 — Client được tự sửa (`users/{uid}`, đã thấy trong code)

`photo`, `bgImage`, `bio` (≤100), `theme`, `uiMode`, `appTheme`, `aura`, `nameColor`, `sfxPack` (chuỗi ngắn), `frame`/`nameFrame` (rỗng hoặc đã nằm trong `inventory`), `examPathActiveTitle` (rỗng hoặc đã nằm trong `examPathTitles`), `lastActive`, `library` (≤300), `videoNotes` (≤300), `examPath` (map), `examPathSaves` (≤10), `recoveryEmail` (≤254), `studySeconds` (chỉ tăng, ≤6h/lần).
Ngoài `users`: `private/*` + `srs/*` (chủ), `friendRequests`/`friends`/`guildInvites` (theo luật), `quizShares`/`videoShares` (create hợp lệ), `reports` (create-only), `guilds.notice` (bang chủ), tự tham gia/rời/trục xuất qua `members`.

### 3. Nhóm 2 — Chỉ backend/admin

`spirit`, `fame`, `seasonScore`, `seasonLessons`, `examPathDailyScore`, `examPathTitles`, `inventory`, `rank`, `buffs`, `x2BoostExpiresAt`, `dailyPurchases`, `usedCodes`, `streakCount`, `lastPlayedDate`, `streakRestorePending`, `name` (đổi tên tốn tiền), `gameId` (sau lần gán đầu), `currentSession`, mảng cũ `friends`/`requests` (đóng băng).
Guild: tạo guild, `level`, `exp`, `leader` (trừ chuyển quyền khi bang chủ rời), perk (`beast/aura/color/frame/bg...`), `name`, `guildId`.
`meta/*` (mọi mốc reset), `giftCodes/*`, `users/*/serverState/*`, `admins/*`.

### 4. File rules

`firestore.rules.hardened` (cùng thư mục) — mỗi nhánh có comment. Điểm chính:
- `users`: update = whitelist key + kiểm tra giá trị từng key; không có nhánh nào cho `spirit/fame/seasonScore/...`; `create` chỉ với giá trị khởi điểm; `delete=false`.
- Tự kiểm tra lại `signedIn()`/`isOwner()`: `signedIn()` chỉ còn xuất hiện cùng điều kiện chặt (đọc, `userGuildKickedByLeader` yêu cầu `leader == auth.uid`, `guildSelfJoin`...). `isOwner()` chỉ đi cùng `userCanEditProfile()` (whitelist), `userSetGameId`, `userHealStub` (chỉ về giá trị khởi điểm, chỉ hồ sơ không có `name`), `userGuildSelf`.
- Bạn bè: subcollection `users/{uid}/friendRequests/{fromUid}` và `users/{uid}/friends/{friendUid}`. Doc id = UID người gửi nên không thể sửa/xoá lời mời người khác; bản ghi bạn hai chiều chỉ tạo được khi người nhận đang giữ lời mời (`exists` đọc trạng thái trước batch).
- Guild: `create=false`; chỉ 4 kiểu update (`notice` bởi bang chủ; tự thêm đúng UID mình khi còn chỗ và chưa ở guild nào; tự bỏ đúng UID mình, bang chủ rời phải chuyển quyền cho người còn lại; bang chủ bỏ đúng 1 người khác); không thể làm `members` rỗng; chỉ bang chủ xoá.
- Giới hạn của Rules cần biết: không duyệt từng phần tử của `library`/`d` (câu hỏi) — chỉ kiểm tra kiểu + số lượng; lọc từ khoá (`isContentBlocked`) vẫn chỉ ở client → muốn ép phía server phải qua Function; chống tạo nhiều tài khoản để nhận quà tân thủ cũng không làm được bằng Rules.

### 5. Thay đổi client bắt buộc

1. Thay mọi `safeUserUpdate/syncUserData` có `spirit/fame/seasonScore/seasonLessons/examPathDailyScore/inventory/rank/buffs/usedCodes/streak*/dailyPurchases/x2BoostExpiresAt` bằng gọi callable (mục 6). Các dòng App.jsx: 517, 526, 1042–1082, 1245, 1371, 1453, 1531, 1588, 1609–1615, 2046–2065, 2292, 2451, 2935–2994, 479, 508, 532; `lib/srs.js` `flush()`.
2. Xoá khối reset mùa/Đạo Lộ/guild trong App.jsx dòng ~736–830 (thay bằng scheduled Functions); client chỉ đọc `meta/*`.
3. `GIFT_CODES`: xoá khỏi `gameData.js`; `importQuizCodeAction` gọi `redeemGiftCode`.
4. Bạn bè: `addFriendAction`, `addRandomFriendAction`, `sendFriendReqToUser` → `setDoc(users/{target}/friendRequests/{me}, {fromUid, fromName, type:'friend', createdAt: serverTimestamp()})`. `acceptFriendReq` → một `writeBatch`: tạo `users/me/friends/sender`, `users/sender/friends/me` (`{since: serverTimestamp()}`), xoá `users/me/friendRequests/sender`. `rejectReq` → xoá doc. Đọc danh sách từ subcollection (thay `user.friends`/`user.requests`). Cần script Admin SDK di trú mảng cũ → subcollection.
5. Mời tông môn: ghi `users/{target}/guildInvites/{guildName}` (chỉ bang chủ). Gia nhập: **đúng thứ tự** `guilds.update({members: arrayUnion(me)})` rồi `users/me.update({guild: name})` (như code hiện tại). Rời: `arrayRemove(me)` rồi `guild: null`. `leaveOrKickGuildAction` xoá nhánh `m !== user.name`; guild/leader cũ lưu **tên** thay vì UID phải di trú sang UID (rules chỉ hiểu UID).
6. `createGuild`, `upgradeGuildLevel`, `buyGuildPerk*`, `exchangeGuildExp`, phạt rời guild → callable. Notice vẫn ghi trực tiếp (client lọc từ khoá).
7. `videoShares`: thêm `owner: user.uid` vào payload ở `generateAndStoreVideoShareCode`; `createdAt` giữ `Date.now()`.
8. `quizShares`: không đổi. `reports`/`hiddenContent`: không đổi (đã dùng `serverTimestamp()`; `hideTarget` phải truyền `hiddenBy = admin uid` — đang đúng).
9. `name` chỉ tạo khi đăng ký; đổi tên → callable `renameUser`.

### 6. Thao tác chuyển sang Cloud Functions (khung code: `functions/index.js`)

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

### 7. Test

`tests/firestore.rules.test.mjs`: đủ 10 case bị từ chối + 6 case được phép như yêu cầu, cộng các case bổ sung (hồ sơ giàu, xoá hồ sơ, giftCodes, mạo danh friend request, report/hiddenContent, giải tán guild).

### 8. Lệnh chạy

```bash
cd hardening
npm install              # cần Java 11+ cho emulator
npm run test:rules       # = firebase emulators:exec --only firestore "node --test tests/"
```

### 9. Checklist triển khai / rollback

1. Sao lưu: `gcloud firestore export` + lưu `firestore.rules` hiện tại (`firebase firestore:rules` hoặc Console → Rules → History).
2. Vô hiệu hoá `GIFT_CODES` cũ; tạo `giftCodes/` mới; tạo `meta/season|guildSeason|examPathDaily` (`nextReset`) bằng Admin SDK.
3. Chạy test rules trên emulator, sửa các case lệch do chưa kiểm chứng.
4. Deploy Functions lên project **staging**, đổi client sang callable, chạy tay: quiz, video, mã quà, mua đồ, kết bạn, guild (tham gia/rời/trục xuất/giải tán), kết thúc mùa.
5. Script di trú: `friends/requests` mảng → subcollection; guild `members/leader` tên → UID; thêm `owner` cho videoShares cũ nếu muốn cho chủ xoá.
6. Chạy `rules` trên staging với app thật; xem log permission-denied (field ghi mà whitelist thiếu → thêm vào whitelist **chỉ khi** field không mang tiền/điểm/quyền).
7. Deploy client + Functions + rules **cùng lúc** lên production (rules trước client mới sẽ làm hỏng thưởng/mua).
8. Rollback: `firebase deploy --only firestore:rules` với file cũ (hoặc khôi phục từ Rules History); client cũ + rules cũ hoạt động lại ngay (Functions để nguyên).
9. Sau deploy: giám sát `serverState/rewards` và số lượng `permission-denied`.

### 10. TODO (thiếu schema/source)

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

## Rà soát điểm ghi Firestore phía client (src/App.jsx)
Quét regex + phân loại THÔ theo từ khoá; cần người rà từng dòng. (src/lib/srs.js đã chuyển sang `claimSrsReward`.)

Tổng: 63 dòng; còn cần chuyển backend: 20 (safeUserUpdate: 31, FieldValue.increment: 12).

| Dòng | Phân loại | Mã |
|---:|---|---|
| 83 | Client được phép (giao diện/nội dung cá nhân) | `const setThemeAction = (m) => { try { localStorage.setItem('themeChosen', '1'); } catch (e) {} playSfx('TOGGLE'); setThemeModeState(m); window.__apply` |
| 85 | Client được phép (giao diện/nội dung cá nhân) | `const setUiModeAction = (m) => { playSfx('TOGGLE'); setUiModeState(m); window.__applyUiMode(m); if (m === 'study') { let chosen = false; try { chosen ` |
| 762 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `const d = { spirit: firebase.firestore.FieldValue.increment(r.s) };` |
| 763 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `if (r.f) d.fame = firebase.firestore.FieldValue.increment(r.f);` |
| 796 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `batch.update(firestore.collection('guilds').doc(g.id), { exp: firebase.firestore.FieldValue.increment(guildRewardTiers[i]) });` |
| 850 | Client được phép (giao diện/nội dung cá nhân) | `const syncUserData = async (newData) => { if (user && user.uid) await firestore.collection('users').doc(user.uid).set(newData, { merge: true }).catch(` |
| 902 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(res.user.uid).set({` |
| 918 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(res2.user.uid).set({` |
| 1046 | Client được phép (giao diện/nội dung cá nhân) | `if (Object.keys(updatePayload).length) await safeUserUpdate(user.uid, updatePayload);` |
| 1209 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { name: clean, spirit: firebase.firestore.FieldValue.increment(-1000), fame: firebase.firestore.FieldValue.increment(-1` |
| 1255 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { photo: profileImage, bgImage: profileBg, bio }); }` |
| 1295 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { recoveryEmail: clean });` |
| 1335 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { spirit: firebase.firestore.FieldValue.increment(spiritChange), fame: firebase.firestore.FieldValue.increment(fameChan` |
| 1358 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1367 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(randomTarget.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1379 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1386 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { friends: firebase.firestore.FieldValue.arrayUnion(req.fromUid), requests: updatedReqs });` |
| 1388 | Client được phép (giao diện/nội dung cá nhân) | `if(targetDoc.exists) { await firestore.collection('users').doc(req.fromUid).update({ friends: firebase.firestore.FieldValue.arrayUnion(user.uid) }); }` |
| 1399 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(req.guildId).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });` |
| 1401 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { guild: req.guildName, requests: updatedReqs });` |
| 1405 | Client được phép (giao diện/nội dung cá nhân) | `const rejectReq = async (reqId) => { playSfx('FAIL'); const updatedReqs = (user.requests \|\| []).filter(r => r.id !== reqId); await safeUserUpdate(user` |
| 1416 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(safeName).set({ name: safeName, level: 1, members: [user.uid], leader: user.uid, guildId: newGId, notice: "Ch` |
| 1417 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { spirit: firebase.firestore.FieldValue.increment(-500), guild: safeName });` |
| 1434 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(targetGuild.id).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });` |
| 1435 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { guild: targetGuild.name });` |
| 1452 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(guildObj.id).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });` |
| 1453 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { guild: guildObj.name });` |
| 1473 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1483 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(guildObj.id).update({ members: newMembersList });` |
| 1484 | Client được phép (giao diện/nội dung cá nhân) | `if (kickedUser) { await firestore.collection('users').doc(kickedUser.uid).update({ guild: null }); }` |
| 1493 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(guildObj.id).update({ members: newMembersList, leader: newLeader });` |
| 1495 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { spirit: firebase.firestore.FieldValue.increment(-500), guild: null }); playSfx('FAIL');` |
| 1526 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `try { await firestore.collection('guilds').doc(gObj.id).update({ notice: noticeText }); }` |
| 1844 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: fullTitle, data: qs, code: compressedCode,` |
| 2014 | Client được phép (giao diện/nội dung cá nhân) | `studySeconds: firebase.firestore.FieldValue.increment(videoStudySeconds)` |
| 2016 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, updatePayload).catch(()=>{});` |
| 2035 | Client được phép (giao diện/nội dung cá nhân) | `safeUserUpdate(user.uid, { videoNotes: updatedNotes }).catch(()=>{});` |
| 2244 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, {` |
| 2245 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `spirit: firebase.firestore.FieldValue.increment(stones),` |
| 2246 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `fame: firebase.firestore.FieldValue.increment(fame)` |
| 2386 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: newLib });` |
| 2427 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: parsedData.t, data: parsedData.d, code: (/` |
| 2499 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: quizTitle, data: questionList, code: compr` |
| 2510 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title, data: questions, code: compressedCode }) }` |
| 2623 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { examPath });` |
| 2643 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPathSaves: upsertSave(saves, entry) }); playSfx('SUCCESS'); alert(`Đã lưu Đạo Lộ "${entry.title}" vào Kho (` |
| 2651 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPathSaves: upsertSave(saves, entry), examPath: firebase.firestore.FieldValue.delete() }); playSfx('CLICK');` |
| 2663 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPath: sv.path, examPathSaves: next }); playSfx('SUCCESS'); setExamPathTab('TREE'); }` |
| 2668 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPathSaves: (user.examPathSaves \|\| []).filter(s => s.id !== sv.id) }); playSfx('FAIL'); }` |
| 2674 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { examPath: firebase.firestore.FieldValue.delete() });` |
| 2720 | Client được phép (giao diện/nội dung cá nhân) | `const setExamPathActiveTitle = (titleId) => { playSfx('CLICK'); syncUserData({ examPathActiveTitle: titleId }); };` |
| 2858 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: newLibrary });` |
| 2923 | Client được phép (giao diện/nội dung cá nhân) | `try { await purchaseItem(pk.id); await safeUserUpdate(user.uid, { sfxPack: pk.id }); } catch (e) { playSfx('ERROR'); alert('Mua thất bại: ' + shortErr` |
| 3339 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={async ()=>{ if(await askConfirm("Hủy bí tịch này?")){ safeUserUpdate(user.uid, {library: user.library.filter(x=>x.id!==s.id)}); playS` |
| 3895 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={async (e)=>{ e.stopPropagation(); if(await askConfirm("Xóa bí tịch này?")){ safeUserUpdate(user.uid, {videoNotes: user.videoNotes.fil` |
| 4321 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={()=>{ playSfx('CLICK'); syncUserData({appTheme: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px` |
| 4323 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={()=>{ playSfx('CLICK'); syncUserData({appTheme: theme.id}); }} className="bg-pink-600 text-white px-3 py-1 text-[9px] font-black">Dùn` |
| 4370 | Client được phép (giao diện/nội dung cá nhân) | `{using ? <span className="text-[9px] text-emerald-400 font-black px-2">ĐANG DÙNG</span> : owned ? <button onClick={() => { playSfx('EQUIP'); syncUserD` |
| 4379 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.aura === a.class ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({aura: ''}); }} className="bg-red-900 text-red-200 border border-red-50` |
| 4389 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.nameFrame === f.id ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameFrame: ''}); }} className="bg-red-900 text-red-200 border border` |
| 4399 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.nameColor === c.color ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameColor: ''}); }} className="bg-red-900 text-red-200 border bor` |
| 4409 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.frame === f.id ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({frame: ''}); }} className="bg-red-900 text-red-200 border border-red-500` |
| 4466 | Client được phép (giao diện/nội dung cá nhân) | `return (<div className="text-center mt-10"><p className="text-[12px] text-red-500 font-black uppercase mb-4 leading-relaxed">Tông môn này đã bị diệt v` |

### Đã chuyển sang backend
mã quà · mua đồ/âm thanh · bùa/Nhân Đôi · đột phá · kết thúc Ải (quiz) · lưu bài học video · SRS · nâng cấp Tông Môn · trang hoàng Tông Môn · đổi Công Trạng · khôi phục chuỗi.

### CHƯA chuyển
Các dòng còn lại trong bảng: đổi tên, tạo/rời Tông Môn (hàm `createGuild`/`leaveGuild` đã có ở server nhưng client CHƯA nối), ải video, reset mùa ở client, thao tác kết bạn/mời (rules mới dùng subcollection), v.v.

## DEPENDENCY_SECURITY_AUDIT
**Trạng thái: BLOCKED — chưa phân loại được từng lỗ hổng.** Phiên này không có mạng nên không chạy được `npm ci`/`npm audit`. Không có số liệu audit mới; những con số dưới đây là báo cáo từ máy Windows của chủ dự án.

| Package | Số liệu báo cáo | Trạng thái |
|---|---|---|
| Frontend (root) | 27 lỗ hổng: 15 moderate, 11 high, **1 critical**; 752 package | NOT VERIFIED — chưa biết package nào, direct hay transitive, có chạm đường chạy thật không |
| `functions/` | 8 moderate; 241 package | NOT VERIFIED |

Quan sát đã xác minh từ `package.json`: toàn bộ hạng mục root là **devDependencies** (esbuild, tailwindcss, postcss, autoprefixer, vite, firebase, firebase-tools, @firebase/rules-unit-testing, typescript). Ứng dụng chạy trong trình duyệt dùng React/Firebase/LZString/mammoth nạp từ CDN (index.html), nên phần lớn cảnh báo ở root nhiều khả năng nằm trong công cụ build/test chứ không trong sản phẩm gửi tới người dùng — **đây là giả thuyết chưa kiểm chứng**, không phải kết luận. `functions/` mới là mã chạy production.

### Quy trình phải làm (cần mạng)
```powershell
nvm use 22
npm ci ; npm audit --json > audit-root.json
cd functions ; npm ci ; npm audit --json > ../audit-functions.json ; cd ..
```
Với từng cảnh báo ghi: direct/transitive, có bản vá tương thích không, có nằm trên đường chạy thật không (devDependency chỉ build/test thì rủi ro thực tế thấp hơn nhưng vẫn ghi). **Không** chạy `npm audit fix --force`. Critical phải có đánh giá và biện pháp trước khi bán.

### Install scripts chưa được phê duyệt (esbuild, protobufjs, re2, @firebase/util…)
Chưa rà (cần tải package để đọc script). Nguyên tắc: chỉ cho phép script của package tin cậy cần thiết (esbuild cần postinstall tải binary; re2 biên dịch native và chỉ là phụ thuộc của firebase-tools), ghi lý do vào file này.

### Ghi chú phiên bản
`esbuild` đang pin `^0.25.0`; bundle trong gói này build bằng 0.28.2 (sandbox). Sau khi `npm ci` với lockfile, chạy `npm run build` lại để bundle khớp phiên bản pin.
