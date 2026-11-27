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

## 7. CẬP NHẬT (sau ảnh Console do chủ dự án cung cấp)
**Nguyên nhân gốc của `auth/api-key-not-valid` đã được xác nhận:** apiKey trong `js/firebase-config.js` bị chép sai 6 ký tự so với Firebase Console.
- Trong file (sai): `AIzaSyAtnPNb-nGauIQZ0WvCErwF3FiYcleN5bw`
- Console (đúng):   `AIzaSyAtnPNb-nGauIQZOwVcErwF3FiYcIeN5bw`
- Khác nhau ở: `Z0WvC` ↔ `ZOwVc` và `cle` ↔ `cIe` (chữ O/số 0, I hoa/l thường dễ nhầm khi chép tay).
- Đã sửa theo ảnh Console. Vì ảnh có thể gây nhầm O/0 và I/l, hãy **dán lại bằng nút copy** của Console nếu vẫn lỗi, rồi chạy `node tools/check-firebase-config.mjs --online`.

**Shop và phần thưởng mùa giải không hoạt động — nguyên nhân khác, KHÔNG phải lỗi giao diện:**
- Toàn bộ giao dịch (mua vật phẩm `purchaseItem`, đột phá `buyRank`, quay `rollGacha`, kích hoạt bùa `activateBuff`, đổi mã…) được thiết kế chỉ chạy qua **Cloud Functions** (`src/lib/serverApi.js`), cố ý KHÔNG có nhánh ghi trực tiếp để chống gian lận.
- Thưởng cuối mùa do hàm định kỳ `finalizeSeason` (chạy mỗi 5 phút) trao; nếu Functions chưa deploy thì không ai được trao thưởng.
- Firebase Console của bạn cho thấy Functions chưa được deploy → shop và thưởng mùa giải sẽ lỗi dù đăng nhập đã đúng. Sửa bằng cách deploy Functions, không sửa code (sửa code để ghi thẳng từ trình duyệt sẽ phá bảo mật và cho phép tự cộng điểm).

Cách deploy (cần gói **Blaze** vì Functions v2 + Scheduler; region `asia-southeast1`; Node 22):
1. `npm i -g firebase-tools` → `firebase login` → trong thư mục gốc dự án.
2. `cd functions && npm install && cd ..`
3. `firebase deploy --only functions --project thienbicanhmong`
4. Kiểm tra Console → Functions thấy `purchaseItem`, `rollGacha`, `finalizeSeason`… ở asia-southeast1.
5. Chỉ SAU khi Functions chạy ổn mới cân nhắc đổi sang `firestore.rules.hardened` (xem `docs/`), và backup Firestore trước.

## 8. CẬP NHẬT — AI Sư Phụ: ví dụ AI, mã chia sẻ, giọng đọc, âm thanh, UX
| Yêu cầu | Đã làm | Tệp |
|---|---|---|
| Ví dụ 1 câu do AI tạo dùng đúng từ | Nút "🤖 TẠO VÍ DỤ BẰNG AI" ở khung kết quả: AI viết 1 câu chứa đúng từ + dịch tiếng Việt, có nút 🔊 ĐỌC CÂU, lưu vào thẻ (dùng lại cho chế độ Điền câu, không tốn API lần sau). Không ghi đè ví dụ gốc của người dùng. Cần API Key Gemini (Hồ Sơ → 🔑 API Key Gemini). Câu AI trả về bị loại nếu không chứa từ cần học. | `lib/aiExample.js`, `lib/srs.js` (`setExample`), `components/SuPhuHub.jsx` |
| Chỗ chép mã chia sẻ Bí Tịch | Tạo Bí Tịch xong hiện **mã 8 ký tự** + nút "📋 CHÉP MÃ"; có thêm ô "📥 Nhận Bí Tịch bằng mã" ngay tại Sư Phụ (kiểm tra nội dung, trùng lặp, dung lượng Tàng Kinh Các). Dùng lại collection `quizShares` với cấu trúc cũ `{t,d,owner,createdAt}`, Tàng Kinh Các dùng chung helper nên không tạo mã trùng. | `lib/quizShare.js`, `features/library/useQuizLibrary.js` |
| Giọng đọc không rõ | Chọn giọng tốt nhất theo ngôn ngữ (ưu tiên neural/Natural/Google/Microsoft, loại giọng eSpeak…), đợi trình duyệt nạp danh sách giọng, bỏ chú thích trong ngoặc khi đọc, mặc định đọc chậm hơn 10%, thêm công tắc "🐢 Đọc chậm" (0.65x). Nếu máy không có giọng đúng ngôn ngữ thì không đọc bằng giọng sai. | `lib/tts.js` |
| Thêm âm thanh | 6 hiệu ứng mới (tự sinh bằng WebAudio, không cần mạng): FLIP (sang thẻ), STAGEUP (qua ải), FANFARE (hoàn thành/đạt thưởng), COPIED, MAGIC (AI xong), SPARKLE (combo ≥10). Âm FLIP/COPIED thuộc nhóm âm giao diện nên tắt được cùng nhóm đó. | `lib/audio.js`, `lib/audioPrefs.js` |
| Tự cuộn lên, phải cuộn xuống để gõ | **Nguyên nhân:** ô gõ có `autoFocus` + `onFocus → scrollIntoView(center)` nên mỗi lần focus trang bị kéo. **Sửa:** bỏ cả hai, dùng `focus({preventScroll:true})`; ô gõ và nút TIẾP THEO nằm trong thanh dính đáy (luôn thấy); sang thẻ mới thì vùng cuộn về đầu một lần có chủ đích; thẻ gọn hơn; `interactive-widget=resizes-content` để bàn phím điện thoại không che ô gõ. | `components/SuPhuHub.jsx`, `app.html` |

**Kiểm thử:** 20 test mới (tts, aiExample, quizShare, giao diện Sư Phụ). Tổng toàn bộ: 14 + 154 + 50 test pass, 0 fail; bundle khớp `src/`.
Ngoài ra đã chạy component thật trong Chromium headless (Firebase giả lập, Gemini giả lập): render, ô gõ tự focus, thanh dính đáy, tạo/hiện ví dụ AI và lưu vào thẻ, sang thẻ không nhảy cuộn, tạo mã Bí Tịch 8 ký tự, ô nhận mã, âm thanh mới được phát; không có lỗi trang.

**Chưa kiểm chứng được:** chất lượng giọng đọc thực tế (phụ thuộc giọng cài trên máy bạn: Windows nên cài giọng "Natural" trong Cài đặt → Giọng nói; Chrome/Edge có giọng online tốt nhất), ví dụ từ Gemini thật (không có mạng), giao diện với Tailwind CDN thật trên điện thoại, và ghi/đọc `quizShares` thật (cần Firebase thật + rules).
