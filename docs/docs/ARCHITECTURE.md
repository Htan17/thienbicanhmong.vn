# ARCHITECTURE (13/11/2026) — mô tả theo source thực tế, chưa kiểm chứng bằng chạy thật

## Thành phần
- **Frontend**: một trang tĩnh `index.html` + `js/app.min.js` (build bằng esbuild từ `src/` qua `tools/build.mjs`; `npm run build`). React 18.3.1 và Firebase JS SDK 10.x (bản *compat*) nạp qua CDN. Điểm vào `src/main.jsx`; gần như toàn bộ giao diện nằm trong `src/App.jsx` (≈4.750 dòng, chưa tách).
- **Firebase Authentication**: đăng ký bằng *Đạo Hiệu* + Mật Mã, ánh xạ sang email giả nội bộ `<đạo hiệu>@thienkieu.com`; có thể liên kết Google; có thể gắn email thật (có xác minh).
- **Cloud Firestore**: hồ sơ `users/{uid}` (+ subcollection `serverState`, `quizSessions`, `friends`, `friendRequests`, `guildInvites`, `private/settings`…), `guilds/{tên}`, `quizShares`, `reports`, `hiddenContent`, `adminAudit`, `meta/*`, `cheatFlags`, bảng giao dịch (ledger) do server ghi.
- **Cloud Functions (v2, Node 22, region asia-southeast1)**: toàn bộ nghiệp vụ tiền tệ/vật phẩm/thưởng/Tông môn/admin (xem `docs/API_DOCUMENTATION.md`, sinh tự động từ code) và 3 hàm lịch (`finalizeSeason`, `finalizeGuildSeason`, `finalizeExamPathDaily`).
- **Firestore Rules**: `firestore.rules` (hiện hành) và `firestore.rules.hardened` (mục tiêu, mặc định chặn, **chưa kích hoạt, chưa chạy test**).
- **Gemini AI**: người dùng tự nhập API key (BYOK), lưu `users/{uid}/private/settings`; gọi từ trình duyệt. Chưa có key phía server.
- **Hosting**: `firebase.json` phục vụ thư mục gốc nhưng loại trừ `functions/`, `src/`, `tests/`, `tools/`, `docs/`, `*.md`, rules…

## Luồng dữ liệu chính
1. Client đọc/ghi hồ sơ cá nhân trong whitelist (ảnh, bio, thư viện…) trực tiếp Firestore.
2. Mọi thay đổi tiền tệ, vật phẩm, thưởng, Tông môn, trang bị đi qua Cloud Function (kiểm tra quyền, transaction, `requestId` idempotent, `rateGate`).
3. Client nghe toàn bộ `users` và `guilds` (`onSnapshot`) để dựng bảng xếp hạng/danh sách: **đây là điểm nghẽn mở rộng** (xem `PERFORMANCE_REPORT.md`).

## Môi trường phát triển
Firebase Emulator (Auth 9099, Firestore 8080, Functions 5001, Pub/Sub 8085, UI 4000) với project giả `demo-tkbc`; test: `npm test`, `npm run test:rules`, `npm run test:integration` (xem `docs/FIREBASE_LOCAL_DEVELOPMENT.md`).

## Giới hạn kiến trúc đã biết
- Quiz/ải video do client dựng và chấm; server chỉ giới hạn trần, thời lượng, cờ bất thường (không thể xác minh đáp án).
- Người dùng đọc được hồ sơ công khai của nhau (collection `users`); xem `KNOWN_ISSUES.md`.
