# Cài đặt trên Windows (PowerShell)
1. Cài Git, Java 11+, Node 22 qua nvm-windows: `nvm install 22 ; nvm use 22 ; node -v` (phải ra v22.x). Không dùng Node 24 cho dự án này.
2. Giải nén gói, mở PowerShell tại thư mục gốc.
3. `npm install` (lần đầu, có mạng) rồi **commit `package-lock.json`**; làm tương tự trong `functions\`. Từ đó dùng `npm ci`.
4. `npm run check` — mọi dòng phải PASS (FAIL lockfile là bình thường cho tới bước 3).
5. `npm run build` — tạo `js\app.min.js`, cập nhật `?v=` trong `index.html`. Không sửa tay file `app.min.js`.
6. `npm run test:all`.
7. Chạy Emulator: xem `docs/FIREBASE_LOCAL_DEVELOPMENT.md`.
`build.sh` còn lại chỉ cho Linux/macOS (`npm run build:sh`).
Lệnh trong `functions\`: dùng `Push-Location functions` / `Pop-Location`; tránh `cd functions` lặp khi đã đứng trong đó.
