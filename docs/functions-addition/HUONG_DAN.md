# getResearchStats – hướng dẫn thêm, kiểm thử và triển khai

Chỉ THÊM mã mới. Không sửa Firestore Rules, không sửa Cloud Function cũ.

## 1. Vị trí dán
| Khối | Tệp | Vị trí |
|---|---|---|
| `researchStats.block.js` | `functions/index.js` | Dán nguyên block ở **cuối tệp**, sau mọi function hiện có |
| `ResearchDashboard.jsx` | `docs/src/components/` | Tệp thay thế bản Dashboard trước (tệp này do tôi tạo ở lượt trước) |
| 1 dòng `<script>` | `docs/index.html` | Ngay sau thẻ `firebase-firestore-compat.js` |
| 1 dòng sửa | `docs/src/App.jsx` ~dòng 4206 | Bỏ `users={allUsers} guilds={allGuilds}` khỏi `<ResearchDashboard …/>` |

Hai nơi phải **cùng region**: `RS_REGION` trong block function và trong `ResearchDashboard.jsx` (mặc định `us-central1`; đổi theo region các function hiện có của bạn).

Yêu cầu phiên bản (trong `functions/package.json`): `firebase-functions` >= 4.4 (có `v2/https`), `firebase-admin` >= 11.4 (có `count()`; khuyến nghị 12+), Node 18+. Nếu thấp hơn: `cd functions && npm i firebase-admin@latest firebase-functions@latest`.

**ESM:** nếu `functions/package.json` có `"type": "module"`, thay 5 dòng `require` đầu block bằng:
```js
import { onCall as rsOnCall, HttpsError as RsHttpsError } from 'firebase-functions/v2/https';
import * as rsLogger from 'firebase-functions/logger';
import { getApps as rsGetApps, initializeApp as rsInitializeApp } from 'firebase-admin/app';
import { getFirestore as rsGetFirestore, FieldPath as RsFieldPath } from 'firebase-admin/firestore';
import rsCrypto from 'crypto';
```
(đặt các `import` lên đầu tệp) và đổi dòng cuối thành `export const getResearchStats = rsOnCall(…)`.

## 2. Kiểm thử nhanh không cần emulator
```
node --test researchStats.mock.test.cjs
```
7 test với Firestore giả lập: chưa đăng nhập, tài khoản thường (kể cả gửi `isAdmin`/`uid` giả), admin (số liệu đúng, không lộ dữ liệu), >1000 user (phân trang), Firestore rỗng, function lỗi (không lộ thông tin nội bộ), block không có lệnh ghi.

## 3. Chạy bằng Firebase Emulator
Cần: `firebase-tools`, Java 11+, Node 18+.
```
firebase emulators:start --only functions,firestore,auth --project <PROJECT_ID>
```
(`firebase.json` cần có `emulators` cho functions 5001, firestore 8080, auth 9099.)
Ở terminal khác:
```
node functions-addition/test-emulator.mjs <PROJECT_ID> <REGION>
```
Script tự tạo tài khoản thường và admin trên Auth Emulator, nạp dữ liệu vào Firestore Emulator và chạy các ca 1–4 bên dưới. Script chỉ gọi `127.0.0.1`.

## 4. Các ca kiểm thử
| Ca | Kết quả mong đợi |
|---|---|
| Chưa đăng nhập | HTTP 401 `UNAUTHENTICATED` |
| Tài khoản thường (kể cả gửi `{isAdmin:true, uid:<admin>}`) | HTTP 403 `PERMISSION_DENIED`, không có số liệu |
| Tài khoản admin (`admins/{uid}` tồn tại) | HTTP 200, số liệu tổng hợp, chỉ có mã `HS-xxxxxx`, không email/uid |
| Firestore không có dữ liệu | HTTP 200, toàn số 0, top rỗng |
| Function lỗi | HTTP 500 `INTERNAL`, thông báo chung, không lộ đường dẫn/stack |

## 5. Ca "function phát sinh lỗi" trên Emulator
Chạy emulator **không có Firestore Emulator** và trỏ Admin SDK vào cổng đóng để KHÔNG chạm Firestore thật:
```
FIRESTORE_EMULATOR_HOST=127.0.0.1:9 firebase emulators:start --only functions,auth --project <PROJECT_ID>
node functions-addition/test-emulator.mjs <PROJECT_ID> <REGION> --expect-internal
```
Nếu emulator ghi đè biến này, hãy dừng Firestore Emulator giữa lúc chạy và gọi lại. Tuyệt đối không để Admin SDK chạy mà thiếu `FIRESTORE_EMULATOR_HOST`, vì khi đó nó sẽ nói chuyện với Firestore thật.

## 6. Xác nhận tài khoản thường không lấy được thống kê dù gọi trực tiếp (trên bản thật, sau khi deploy)
1. Đăng nhập app bằng **tài khoản thường**, mở Console trình duyệt và chạy:
   ```js
   await firebase.app().functions('us-central1').httpsCallable('getResearchStats')()
   ```
   Kết quả đúng: lỗi `functions/permission-denied` ("Bạn không có quyền truy cập").
2. Gọi trực tiếp bằng HTTP với token của tài khoản thường:
   ```js
   const t = await firebase.auth().currentUser.getIdToken();
   // dùng URL của function trong Firebase Console (Functions > getResearchStats)
   curl -i -X POST "<URL>" -H "Authorization: Bearer <t>" -H "Content-Type: application/json" -d '{"data":{}}'
   ```
   Kết quả đúng: HTTP 403 `PERMISSION_DENIED`. Không có token: 401 `UNAUTHENTICATED`.
3. Đăng nhập bằng tài khoản có `admins/{uid}`: Dashboard hiển thị số liệu.

## 7. Triển khai sau khi kiểm thử đạt
```
cd functions && npm i
firebase deploy --only functions:getResearchStats --project <PROJECT_ID>
cd ../docs && npm run build        # sinh lại js/app.min.js
```
Sau đó đưa thư mục `docs/` lên hosting hiện tại (GitHub Pages: commit và push). **Không deploy `firestore.rules`** vì không có thay đổi rules. Sau deploy thực hiện mục 6.

Lưu ý chi phí: mỗi lần admin bấm tải số liệu, function đọc mỗi document `users` một lần (chỉ các trường cần thiết). Chỉ admin gọi được nên chi phí nhỏ; nếu số người dùng lên hàng chục nghìn, nên cân nhắc lưu snapshot hằng ngày.
