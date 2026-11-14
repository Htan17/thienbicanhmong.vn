# KNOWN_ISSUES — V15.0.0-rc.0 (đối chiếu source ngày 14/11/2026)

Trạng thái gói: **NOT PRODUCTION READY**. Chưa triển khai staging/production. Nhật ký cũ V13–V14 (nguyên văn) nằm ở `docs/archive/KNOWN_ISSUES_V13_V14_HISTORY.md`.

Nhãn: **PASS** đã chạy và đạt · **NOT RUN** viết rồi nhưng chưa chạy · **BLOCKED** không chạy được do thiếu mạng/công cụ · **NOT VERIFIED** có code, chưa có bằng chứng chạy.

## Kiểm thử và công cụ
| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Unit: root / frontend / functions | **PASS** 11 / 91 / 50 | Chạy 14/11/2026. Chỉ là test logic thuần, không chứng minh luồng Firestore/Functions |
| `check:globals`, `build:check` | **PASS** | `build:check` đạt với esbuild 0.28.2 (khác bản pin `^0.25.0`) |
| `preflight` (`npm run check`) | 2 FAIL, 2 WARN | Thiếu 2 lockfile; chưa cài `node_modules` |
| `package-lock.json`, `functions/package-lock.json` | **BLOCKED** | Cần mạng để `npm install` rồi commit; không được tạo tay |
| `npm audit` | **BLOCKED** | Số liệu cũ (27 FE/1 critical, 8 moderate functions) chưa được tái kiểm |
| Firestore Rules test (`test:rules`) | **BLOCKED** | Thiếu `@firebase/rules-unit-testing`, `firebase-tools` |
| Integration test (`test:integration`) | **BLOCKED** | Thiếu `firebase-admin` (chưa `npm ci` trong `functions/`) và cần Emulator đang chạy |
| E2E, trình duyệt, responsive, load test | **NOT RUN** | Chưa có |

## Backend và bảo mật
| Hạng mục | Trạng thái |
|---|---|
| Cloud Functions (28 hàm, `functions/index.js`; xem `API_DOCUMENTATION.md`) | Code đã viết; **NOT VERIFIED** trên Emulator/staging |
| `firestore.rules` đang được `firebase.json` deploy | Bản tương thích client cũ (V11) và **còn lỗ hổng** (xem `SECURITY_AUDIT.md`) |
| `firestore.rules.hardened` | Đã viết, chưa test, **chưa kích hoạt** (`npm run rules:activate-hardened` chỉ chạy sau khi test rules đạt và deploy cùng client mới) |
| Client còn ghi trực tiếp | 20 lời gọi `safeUserUpdate` và 1 `increment(` trong `src/App.jsx` (đếm 14/11/2026); chi tiết từng chỗ: `SECURITY_AUDIT.md` |
| Chấm quiz phía server | Chưa có. `correct` do client khai nên lượt học có `verified:false`; chỉ có phiên 1 lần, thời lượng tối thiểu, trần ngày |
| Ải video / SRS | Số liệu do client khai; chỉ có trần/lần và trần/ngày |
| App Check | Chưa tích hợp (không có trong `src/` hay `functions/`) |
| Custom Claims admin | Có `functions/scripts/grant-admin.js` và kiểm tra trong rules hardened; chưa chạy |
| Auth (email khôi phục) | Có code xác minh (`verifyBeforeUpdateEmail`); chưa chạy thử; script `scrub-recovery-email.js` chưa chạy |
| Di trú dữ liệu | `migrate-friends-requests.js` (dry-run mặc định) chưa chạy. Chưa có script đổi Tông môn từ tên sang UID: Tông môn cũ lưu theo tên sẽ bị server từ chối |
| Mua bằng Danh Vọng (`currencyType='fame'`) | Server không hỗ trợ; trước đây ghi nhận không có nút nào dùng (chưa kiểm lại) |
| Phần thưởng mùa | Chỉ phát khi các hàm `finalize*` đã deploy và Pub/Sub chạy; popup thưởng mùa không còn bật từ client |
| Mã quà cũ | Đã lộ trong bản V11, coi là vô hiệu; người mua phải tạo mã mới |

## Mã nguồn và vận hành
| Hạng mục | Trạng thái |
|---|---|
| `src/App.jsx` | 4.757 dòng, chưa tách; không lazy loading/code splitting |
| `js/app.min.js` | Là build của `src/` hiện tại (build lại 14/11/2026). Phải build lại sau mỗi lần sửa `src/` và sau khi có lockfile |
| Research Dashboard | Có render trong `App.jsx`; chưa chạy thật; các chỉ số newUsers/growth/retention chưa xác minh được thu thập |
| Xoá tài khoản | Có UI và hàm; chưa dọn bản ghi bạn bè đối xứng |
| Node 22 (Functions) | Hạn nâng cấp lên Node 24 trước 2027-04-30 (theo ghi chú NEXT_TASKS) |

## Pháp lý và tài nguyên (người mua tự rà)
- `dieu-khoan.html` còn tuyên bố dự án "phi thương mại"; `index.html` và `dieu-khoan.html` còn URL GitHub Pages của người bán. Cần thay và nhờ luật sư rà (`docs/legal/LICENSE_AND_ASSETS.md`).
- Chưa có file `LICENSE`: quyền sở hữu/phạm vi chuyển nhượng còn là **bản nháp chưa xác minh**; không tạo giấy phép thay chủ sở hữu.
- Tài nguyên bên thứ ba chưa xác minh quyền thương mại (Pinterest GIF, Mixkit, DiceBear, font).
