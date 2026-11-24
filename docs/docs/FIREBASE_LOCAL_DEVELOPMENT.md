# Phát triển & kiểm thử cục bộ — không cần thẻ tín dụng / Blaze
**Trạng thái: NOT VERIFIED.** Cấu hình và script đã viết và kiểm tra cú pháp/đường dẫn (`npm run check`), nhưng Emulator CHƯA được chạy trong phiên tạo gói này (không có firebase-tools/mạng). Lần chạy đầu tiên của bạn là lần kiểm chứng đầu tiên — ghi kết quả vào `docs/TEST_REPORT.md`.

Emulator dùng project giả `demo-tkbc`: không cần đăng nhập Google, không cần Billing, không gọi Production.

## Yêu cầu
Node 22 (`nvm-windows`: `nvm install 22` → `nvm use 22`), Java 11+ (Firestore Emulator), Git. Máy đang dùng Node 24 vẫn chạy được lệnh Node thuần nhưng `npm run check` sẽ báo FAIL — chủ ý, vì Functions chạy `nodejs22`.

## Cài đặt (từ thư mục gốc dự án, PowerShell)
```powershell
npm install            # lần đầu có mạng; sau khi có package-lock.json thì dùng: npm ci
Push-Location functions ; npm install ; Pop-Location
npm run check          # kiểm tra môi trường/cấu hình
npm run build          # js/app.min.js
npm run test:all       # root + frontend + functions (không cần Emulator)
```
## Chạy Emulator (cửa sổ 1)
```powershell
npm run emulators      # Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, UI 4000
```
Dùng `firebase.emulator-full.json` với **rules hardened** để lộ sớm chỗ client chưa tương thích. Mở http://127.0.0.1:5000 — ứng dụng tự nhận Emulator khi chạy trên localhost mà chưa có `js/firebase-config.js` (hoặc `?emulator=1`).
## Nạp dữ liệu mẫu (cửa sổ 2)
```powershell
npm run emulators:seed   # alice/bob/admin @thienkieu.com, mật khẩu Demo#12345 (chỉ local)
```
## Test Security Rules
```powershell
npm run test:rules       # Emulator Firestore + tests/rules/firestore.rules.test.mjs
```
Chỉ khi PASS mới `npm run rules:activate-hardened` và triển khai rules cùng lúc với client mới.
## Cần phân biệt mock và dịch vụ thật
Emulator KHÔNG giả lập Gemini (BYOK — người dùng nhập key, gọi từ trình duyệt), YouTube, gửi email Auth thật. Các luồng đó chỉ kiểm chứng được với dịch vụ thật.
## Chưa có
Storage Emulator (source không dùng Storage). Test tích hợp Functions↔Firestore trên Emulator và E2E trình duyệt: chưa viết.

## Pub/Sub Emulator và scheduled Functions (cập nhật 12/11/2026)
- `firebase.emulator-full.json` và `firebase.json` đã khai báo Pub/Sub Emulator tại `127.0.0.1:8085`. Các hàm `finalizeSeason`, `finalizeGuildSeason`, `finalizeExamPathDaily` (onSchedule) cần emulator này mới được nạp; trước đây chúng bị bỏ qua.
- Pub/Sub Emulator cần Java (giống Firestore Emulator). Trạng thái: **CHƯA kiểm chứng trên Windows** — sau khi chạy lại `npm run emulators`, CMD phải hiện Pub/Sub READY và không còn dòng "skipping" cho 3 hàm trên. Emulator không tự kích hoạt lịch; kích thủ công qua Emulator UI hoặc `firebase functions:shell`.

## Luôn chạy bằng project giả `demo-tkbc`
- Chỉ dùng `npm run emulators` (đã gắn `--project demo-tkbc`). Đừng chạy `firebase emulators:start` trần: CLI sẽ lấy project từ `.firebaserc` hoặc `firebase use` trên máy bạn (ví dụ `thienbicanhmong`) và URL Functions sẽ hiện project đó.
- Kiểm tra: `Get-Content .firebaserc` (nếu có) và `firebase use`; dòng đầu CMD phải ghi `demo-tkbc`. Source hiện không còn Project ID người bán (chỉ còn trong `tools/preflight.mjs` làm chuỗi kiểm tra và URL GitHub Pages).
