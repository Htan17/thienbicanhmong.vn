> **ĐÃ LƯU TRỮ (ARCHIVED) — chỉ để tham khảo lịch sử.** Nhật ký kiểm toán V14 (phần 1/2). Tài liệu hiện hành thay thế: `docs/technical/SECURITY_AUDIT.md`, `docs/technical/KNOWN_ISSUES.md`. Xem `docs/ARCHIVE_INDEX.md`.

# Lịch sử kiểm toán V14
> Gộp từ: docs/history/AUDIT_HISTORY.md, docs/history/AUDIT_HISTORY.md (13/11/2026, sắp xếp lại thư mục).

## V14 — BÁO CÁO PHẦN 1/2 (chưa phải bản cuối)
Gói này là nửa đầu theo yêu cầu "làm một nửa trước". KHÔNG production-ready, KHÔNG ready-for-staging.

### Đã làm thật (có test chạy được)
- Server: quiz, video, SRS, mã quà, shop, bùa, đột phá, đổi tên, tạo/rời Tông Môn, nâng cấp/trang hoàng/đổi Công Trạng, khôi phục chuỗi, xoá tài khoản, thống kê nghiên cứu, 3 job chốt mùa có checkpoint.
- Client: nối 11 luồng kinh tế vào backend (xem docs/technical/SECURITY_AUDIT.md); gift code gỡ khỏi bundle nguồn; region dùng chung.
- Test: 33 test server (pass) + 11 test V11 (pass). Chưa có test Emulator/E2E.

### Còn lại cho phần 2
1. Build thật + lockfile + sửa lỗi runtime (bundle `js/app.min.js` đang CŨ).
2. Nối nốt: đổi tên, tạo/rời Tông Môn, ải video, bỏ reset mùa ở client, kết bạn subcollection.
3. Chạy Emulator: rules + functions; sau đó mới kích hoạt rules hardened.
4. Quiz chấm điểm phía server (lưu đề/đáp án server); xác minh SRS/video mạnh hơn.
5. Auth, Custom Claims admin, App Check, admin panel, migration (có dry-run/rollback).
6. UI/UX, tách App.jsx, CI, E2E, tài liệu còn thiếu, LICENSE_AND_ASSETS.md.

### Số liệu hiện tại
App.jsx còn 31 safeUserUpdate / 12 FieldValue.increment.

## Audit ban đầu (V11)
- Stack: React 18 UMD + esbuild (`build.sh` → `js/app.min.js`), Tailwind CDN, Firebase compat 10.7.1 (Auth, Firestore, Functions SDK đã nạp nhưng chưa dùng), Gemini gọi từ trình duyệt (BYOK), host GitHub Pages. Không có backend.
- `src/App.jsx` ≈ 485 KB một component; mọi logic game ghi thẳng Firestore từ client.
- Baseline đã chạy: `node --test tests/*.test.mjs` → 11/11 pass (chỉ test contentFilter/moderation). Các test trong `src/**/*.test.js` (adaptive, docx-import, quiz-v2) **CHƯA chạy** (không có runner/dependency trong môi trường này).
- `npm ci`, `npm run build` (esbuild), Tailwind build, Firebase Emulator: **CHƯA XÁC MINH** — môi trường kiểm tra không có mạng. Không có `package-lock.json` trong source.
- Lỗ hổng Firestore Rules & nguồn gian lận: xem `docs/technical/SECURITY_AUDIT.md` (14 mục). Nghiêm trọng nhất: owner sửa toàn bộ hồ sơ, ai cũng tăng spirit/fame/đặt điểm mùa/guild/meta, `GIFT_CODES` lộ trong bundle.
- Auth: đăng nhập bằng email giả `<tên>@thienkieu.com` (App.jsx ~889). Lỗi đổi email → đăng nhập bằng email giả: **CHƯA điều tra/sửa** (xem KNOWN_ISSUES).
- Gemini: key lưu `users/{uid}/private/settings` hoặc localStorage; chưa rà các phần retry/fallback/UI kiểm tra key.
