# TKBC FULL — Báo cáo audit & khôi phục (V16 → V17)

Phạm vi thực hiện trong phiên này: **Phase 1–3 (audit, nguyên nhân lỗi API key, sửa khởi tạo Firebase)**, test, tài liệu.
Chưa thực hiện: refactor lớn, kiểm thử đăng nhập thật, Emulator/Rules, deploy (xem mục "Chưa làm / chưa kiểm chứng").

## 1. Kiểm kê
- 233 tệp. `src/App.jsx` chỉ còn 272 dòng (đã được tách từ các phiên trước vào `src/app`, `src/features`, `src/components`, `src/lib`).
- Firebase SDK 10.7.1 (compat) nạp qua CDN **một lần** trong `app.html`; `firebase.initializeApp` chỉ có **một** chỗ gọi: `src/config/firebase.js` (có chặn `!firebase.apps.length`). Không có instance thứ hai.
- Không có `allow ... if true` trong `firestore.rules` / `firestore.rules.hardened`.
- Đường dẫn asset đều tương đối → chạy được dưới base path `/thienbicanhmong.vn/` của GitHub Pages.
- `firebase.json` / `.firebaserc` trỏ `thienbicanhmong`. Thông tin trong `js/firebase-config.js` khớp danh sách bạn cung cấp (projectId, authDomain, storageBucket, senderId, appId).

## 2. Nguyên nhân lỗi `auth/api-key-not-valid`
Mã trả về này do Google (Identity Toolkit) sinh ra khi **chuỗi apiKey nhận được không tồn tại / không đúng**. Phân tích mã nguồn cho thấy:

1. **Nguyên nhân hệ thống đã xác định được (đã sửa):** `.gitignore` của bản này liệt kê `js/firebase-config.js`. Khi đẩy lên GitHub/Vercel, file KHÔNG được commit → trang deploy không có cấu hình. Thêm vào đó `app.html` nạp file bằng `onerror="void 0"` nên lỗi tải file bị **nuốt im lặng**, người dùng chỉ thấy lỗi mơ hồ phía sau. Ngoài ra không có bước kiểm tra định dạng key nên key rỗng/placeholder/thừa ký tự đều được gửi thẳng lên Google.
2. **Chưa thể xác nhận bằng offline:** key trong `js/firebase-config.js` (`AIzaSyAtnPN…cN5bw`) **đúng định dạng** (39 ký tự), nhưng môi trường làm việc không có mạng nên **không thể hỏi Google xem key còn hiệu lực hay không**. Nếu sau khi deploy bản V17 vẫn còn lỗi, nghĩa là key này không khớp Console (đã bị xoá/tạo lại, hoặc sao chép nhầm project). Khi đó chạy lệnh dưới và đối chiếu với Firebase Console → Project settings → Your apps → Web app:
   `node tools/check-firebase-config.mjs --online`
   - `API_KEY_INVALID` → key sai/đã xoá, phải lấy lại từ Console (không tự tạo key).
   - `EMAIL_NOT_FOUND` / `INVALID_LOGIN_CREDENTIALS` → key hợp lệ.
   - Thông báo có "referer/blocked" → key bị giới hạn domain/API trong Google Cloud Console; thêm `htan17.github.io`, domain Vercel, `localhost`, và bật API "Identity Toolkit".

## 3. Thay đổi (V17)
| Tệp | Thay đổi |
|---|---|
| `.gitignore` | Bỏ `js/firebase-config.js` khỏi danh sách ignore (bản FULL phải deploy file này; đây là Web config công khai). **Bản Commercial phải giữ ignore.** |
| `app.html` | `onerror` của `firebase-config.js` giờ đặt cờ `__tkbcConfigLoadFailed` thay vì nuốt lỗi; cập nhật `?v=` bundle. |
| `src/config/firebaseConfigCheck.js` (mới) | Kiểm tra apiKey/authDomain/projectId/appId: undefined, null, rỗng, placeholder, sai định dạng. |
| `src/config/firebase.js` | Dừng sớm với thông báo rõ nguyên nhân nếu cấu hình hỏng; thông báo thiếu file phân biệt "chưa tạo" và "không tải được (404)". Vẫn khởi tạo đúng một lần. |
| `src/features/auth/authHelpers.js` | Dịch thêm `auth/api-key-not-valid…`, `auth/invalid-api-key`, `auth/unauthorized-domain`, `auth/popup-blocked`. |
| `js/app.min.js`, `app.html ?v=` | Build lại bằng esbuild 0.28.2 (đúng phiên bản dự án ghim). |
| `sw.js` | Tăng VERSION để xoá cache cũ chứa bản thiếu cấu hình. |
| `vercel.json` (mới) | Static site, không build, Root Directory = thư mục gốc; no-cache cho `sw.js` và `firebase-config.js`. |
| `tools/check-firebase-config.mjs` (mới) | Chẩn đoán cấu hình offline / `--online`. |
| `src/config/firebaseConfigCheck.test.mjs` (mới) | 6 test: định dạng, placeholder, key hỏng, config đi kèm, thứ tự nạp script, SDK nạp một lần. |

Không đụng tới Firestore rules, Functions, dữ liệu, collection/field, hay bản Commercial.

## 4. Kết quả kiểm thử (chạy thật)
- `build --check`: PASS (bundle khớp `src/`).
- Test root 14/14, frontend 137/137 (131 cũ + 6 mới), functions 50/50. **Tổng 201 pass, 0 fail.**
- `check:globals`: OK. `preflight`: 2 FAIL có sẵn từ trước (thiếu `package-lock.json` cả root và `functions/`; cần mạng để tạo, không tạo tay).

## 5. Chưa làm / chưa kiểm chứng (nói rõ, không giả lập)
- **Đăng nhập thật chưa được kiểm thử** (Email/Password, Google). Không có mạng/Firebase Console trong phiên này.
- **Twitter và Anonymous:** Console đã bật, nhưng **mã nguồn không có luồng đăng nhập Twitter hay ẩn danh** (chỉ có Email/Password và Google). Muốn dùng phải bổ sung tính năng — chưa làm vì ngoài việc khôi phục.
- **Rules Emulator** (`npm run test:rules`) và integration test cần `firebase-tools` + Java + mạng: chưa chạy.
- **Cloud Functions chưa deploy** (theo Console). Rules `hardened` chỉ nên bật sau khi Functions chạy, nếu không sẽ hỏng tính năng kinh tế.
- **Refactor lớn không thực hiện:** `App.jsx` đã nhỏ (272 dòng); di chuyển thêm khi chưa chạy được app thật là rủi ro lớn hơn lợi ích. Chưa kiểm tra circular dependency bằng công cụ chuyên dụng.
- GitHub Pages / Vercel **chưa deploy** (cần sự đồng ý của bạn). Bản Commercial không có trong gói này nên chưa tách/kiểm tra.

## 6. Việc bạn cần làm
1. Đối chiếu `apiKey` với Firebase Console; chạy `node tools/check-firebase-config.mjs --online` trên máy có mạng.
2. Giải nén, **commit cả `js/firebase-config.js`**, deploy thử lên nhánh/preview trước.
3. Firebase Console → Authentication → Settings → Authorized domains: thêm `htan17.github.io`, domain Vercel, `localhost`.
4. Google Cloud Console → Credentials → Browser key: referrer cho các domain trên; API restrictions phải gồm Identity Toolkit API, Token Service API, Cloud Firestore API.
5. Máy Windows: `npm install`, `npm run test:all`, `npm run build`; backup Firestore trước khi deploy bất cứ rules/functions nào.
6. GitHub Pages: publish từ thư mục gốc (branch). Vercel: Root Directory = thư mục chứa `vercel.json`, Framework = Other, không cần build command.
