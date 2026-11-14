# V14 — BÁO CÁO PHẦN 1/2 (chưa phải bản cuối)
Gói này là nửa đầu theo yêu cầu "làm một nửa trước". KHÔNG production-ready, KHÔNG ready-for-staging.

## Đã làm thật (có test chạy được)
- Server: quiz, video, SRS, mã quà, shop, bùa, đột phá, đổi tên, tạo/rời Tông Môn, nâng cấp/trang hoàng/đổi Công Trạng, khôi phục chuỗi, xoá tài khoản, thống kê nghiên cứu, 3 job chốt mùa có checkpoint.
- Client: nối 11 luồng kinh tế vào backend (xem CLIENT_WRITE_AUDIT.md); gift code gỡ khỏi bundle nguồn; region dùng chung.
- Test: 33 test server (pass) + 11 test V11 (pass). Chưa có test Emulator/E2E.

## Còn lại cho phần 2
1. Build thật + lockfile + sửa lỗi runtime (bundle `js/app.min.js` đang CŨ).
2. Nối nốt: đổi tên, tạo/rời Tông Môn, ải video, bỏ reset mùa ở client, kết bạn subcollection.
3. Chạy Emulator: rules + functions; sau đó mới kích hoạt rules hardened.
4. Quiz chấm điểm phía server (lưu đề/đáp án server); xác minh SRS/video mạnh hơn.
5. Auth, Custom Claims admin, App Check, admin panel, migration (có dry-run/rollback).
6. UI/UX, tách App.jsx, CI, E2E, tài liệu còn thiếu, LICENSE_AND_ASSETS.md.

## Số liệu hiện tại
App.jsx còn 31 safeUserUpdate / 12 FieldValue.increment.
