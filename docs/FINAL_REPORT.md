# FINAL_REPORT — V13 (trạng thái: WIP, CHƯA đạt production-ready)

## Phân biệt trạng thái
| Hạng mục | Đã viết code | Đã chạy test | Emulator | Build | Staging | Production |
|---|---|---|---|---|---|---|
| Rules hardened | Có | Chưa | Chưa | — | Chưa | Chưa |
| Rules tests | Có | Chưa | Chưa | — | — | — |
| Cloud Functions | Có (một phần) | Unit logic thuần: 10/10 pass | Chưa | — | Chưa | Chưa |
| Client nối backend | Chỉ wrapper `serverApi.js` | — | — | Chưa | Chưa | Chưa |
| Test V11 sẵn có (`tests/*.test.mjs`) | — | 11/11 pass | — | — | — | — |
| `npm ci`, `npm run build` | — | KHÔNG chạy được (không có mạng) | — | Chưa | — | — |
| E2E, Auth fix, Dashboard UI, tách App.jsx, tài liệu buyer | Chưa làm | | | | | |

## Đã làm
1. Hợp nhất source V11 + hardening vào một cây (bỏ 3 thư mục backup nặng khỏi bản giao; vẫn có trong zip V11 gốc). Zip "gói hardening" thứ hai không được đính kèm lần này; mình dùng gói hardening do chính mình tạo trong hội thoại.
2. `functions/lib/catalog.js` lấy giá/cảnh giới/buff/danh hiệu thật từ `gameData.js` (hết `PRICES = {}`).
3. `functions/index.js`: các hàm liệt kê trong KNOWN_ISSUES; transaction đọc hết trước rồi ghi (đã sửa lỗi đọc guild sau khi ghi); idempotency (`requestId`/`sessionId`), sổ cái `users/{uid}/ledger`, trần thưởng/ngày, phiên quiz một lần.
4. `getResearchStats` chỉ trả số liệu thật có thể đo, liệt kê rõ chỉ số chưa thu thập.
5. Unit test logic kinh tế (`functions/test/economy.test.js`).

## Chưa làm / lỗi còn lại
Xem `docs/KNOWN_ISSUES.md` (đầy đủ). Quan trọng nhất: chưa sửa App.jsx để gọi backend, chưa sửa Auth, chưa kiểm chứng rules/functions trên emulator, chưa build, Quiz chưa chấm điểm phía server được.

## Cách dùng gói này an toàn
Giữ nguyên `firestore.rules` (V11) cho đến khi client được nối và kiểm thử trên staging. Không deploy `firestore.rules.hardened` sớm. Vô hiệu hoá GIFT_CODES cũ ngay.

## V13.1 — kết quả phiên này (đối chiếu 7 phát hiện)
| # | Phát hiện | Xác minh | Xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | serverApi.js chưa dùng; 44/33 vị trí ghi | Đúng (thực tế 45 `safeUserUpdate`, 29 `increment`) | Nối 1 luồng (gift code) + `docs/CLIENT_WRITE_AUDIT.md` (88 điểm ghi phân loại thô) | MỘT PHẦN |
| 2 | Nhiều file rules, firebase.json | Đúng: trỏ `firestore.rules` (V11) | Một file deploy + lệnh kích hoạt hardened + chú thích | Đã làm (rules vẫn yếu cho tới khi kích hoạt) |
| 3 | Gift code lộ | Đúng | Xoá khỏi client; server kiểm tra hạn/lượt/đã dùng | Đã sửa code; chưa chạy thật; mã cũ phải thu hồi |
| 4 | Lệch region | Đúng | Cấu hình dùng chung + test | Đã sửa + test 1/1 pass |
| 5 | Quiz chưa chống gian lận hoàn toàn | Đúng | Không đổi: cần đề/đáp án phía server | CHƯA |
| 6 | Thiếu function | Đúng | Không làm thêm | CHƯA |
| 7 | Auth | Chưa điều tra | — | CHƯA |
Phát hiện thêm: `getResearchStats` V13 trả sai định dạng so với Dashboard -> đã sửa theo hợp đồng (chưa chạy thật).

Test: Unit functions 11 (pass 11); test V11 11/11; Rules emulator, Functions emulator, Integration, E2E: CHƯA CHẠY. npm ci / build: CHƯA CHẠY.

## Cập nhật lần 2
Test functions: 19 test, 19 pass (kinh tế, region, catalog-sync). Test V11: 11/11. App.jsx: 5 luồng đã nối (mã quà, mua đồ, mua âm thanh, bùa, đột phá); còn 39 `safeUserUpdate`/24 `increment`. Chưa build (không có esbuild/mạng) => thay đổi App.jsx chưa được biên dịch thử, chỉ kiểm tra cân ngoặc.

## Cập nhật lần 3
Luồng Quiz đã nối backend (startQuiz/claimQuizReward). Test functions: 23/23 pass (kinh tế, region, catalog-sync, parity). Chưa build/emulator. Còn 38 safeUserUpdate / 20 increment ở App.jsx.

## Cập nhật lần 4
Nối thêm claimVideoReward + claimSrsReward. Test functions 23/23, V11 11/11 (chạy thật). Chưa build/emulator/staging. Còn 38 safeUserUpdate / 19 increment ở App.jsx. Xem docs/BUYER_HANDOVER.md.
