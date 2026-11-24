# BACKUP_RESTORE (13/11/2026) — lệnh tham khảo, CHƯA chạy thử; đối chiếu tài liệu Google Cloud hiện hành trước khi dùng
Yêu cầu: gói Blaze, `gcloud`/`firebase-tools` đã đăng nhập đúng tài khoản người mua, một Cloud Storage bucket.
## Firestore
- Xuất: `gcloud firestore export gs://<BUCKET>/backups/<NGÀY> --project=<PROJECT_ID>`
- Nhập (khôi phục): `gcloud firestore import gs://<BUCKET>/backups/<NGÀY>/<THƯ_MỤC_EXPORT> --project=<PROJECT_ID>` (ghi đè tài liệu cùng ID; nên thử trên project phụ trước)
- Lịch sao lưu tự động: `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d --project=<PROJECT_ID>`
- Khôi phục về thời điểm (nếu bật PITR): xem tài liệu "Point-in-time recovery" của Firestore.
## Authentication
- `firebase auth:export users.json --project <PROJECT_ID>`; nhập: `firebase auth:import users.json --hash-algo=... --project <PROJECT_ID>` (cần tham số băm của project nguồn để giữ mật khẩu).
## Cấu hình/mã
Mã, rules, indexes nằm trong repo (`firebase.json`, `firestore.rules`, `firestore.indexes.json`). Khoá dịch vụ **không** để trong repo.
## Kiểm tra sau khôi phục
Đăng nhập thử; kiểm tra số `users`, `guilds`; kiểm tra bảng `ledger`/`serverState` còn nhất quán; chạy `node tools/preflight.mjs`.
