# Audit ban đầu (V11)
- Stack: React 18 UMD + esbuild (`build.sh` → `js/app.min.js`), Tailwind CDN, Firebase compat 10.7.1 (Auth, Firestore, Functions SDK đã nạp nhưng chưa dùng), Gemini gọi từ trình duyệt (BYOK), host GitHub Pages. Không có backend.
- `src/App.jsx` ≈ 485 KB một component; mọi logic game ghi thẳng Firestore từ client.
- Baseline đã chạy: `node --test tests/*.test.mjs` → 11/11 pass (chỉ test contentFilter/moderation). Các test trong `src/**/*.test.js` (adaptive, docx-import, quiz-v2) **CHƯA chạy** (không có runner/dependency trong môi trường này).
- `npm ci`, `npm run build` (esbuild), Tailwind build, Firebase Emulator: **CHƯA XÁC MINH** — môi trường kiểm tra không có mạng. Không có `package-lock.json` trong source.
- Lỗ hổng Firestore Rules & nguồn gian lận: xem `docs/RULES_AUDIT_REPORT.md` (14 mục). Nghiêm trọng nhất: owner sửa toàn bộ hồ sơ, ai cũng tăng spirit/fame/đặt điểm mùa/guild/meta, `GIFT_CODES` lộ trong bundle.
- Auth: đăng nhập bằng email giả `<tên>@thienkieu.com` (App.jsx ~889). Lỗi đổi email → đăng nhập bằng email giả: **CHƯA điều tra/sửa** (xem KNOWN_ISSUES).
- Gemini: key lưu `users/{uid}/private/settings` hoặc localStorage; chưa rà các phần retry/fallback/UI kiểm tra key.
