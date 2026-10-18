# Thiên Kiêu Bí Cảnh

> Web app học ngoại ngữ qua video YouTube, được "game hoá" theo phong cách tu tiên: xem video có phụ đề song ngữ, tra từ, luyện viết chữ Hán, làm bài trắc nghiệm, ôn từ vựng ngắt quãng, thi đua trên bảng xếp hạng và lập môn phái.

**Demo:** https://htan17.github.io/thienbicanhmong.vn/
**Ngôn ngữ giao diện:** Tiếng Việt  |  **Ngôn ngữ học:** Trung, Nhật, Hàn, Anh  |  **Giá:** Miễn phí, phi thương mại

---

## Mục lục

1. [Tính năng](#tính-năng)
2. [Hệ thống game hoá](#hệ-thống-game-hoá)
3. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
4. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
5. [Chạy trên máy](#chạy-trên-máy)
6. [Cấu hình Firebase](#cấu-hình-firebase)
7. [Build và triển khai](#build-và-triển-khai)
8. [Bảo mật và pháp lý](#bảo-mật-và-pháp-lý)
9. [Lộ trình](#lộ-trình)
10. [Đóng góp](#đóng-góp)
11. [Giấy phép](#giấy-phép)

---

## Tính năng

### Học qua video
- Dán liên kết YouTube, ứng dụng tách phụ đề và hiển thị **song ngữ từng câu** kèm **Pinyin / Romaji** (tuỳ ngôn ngữ).
- Chỉ nhúng trình phát IFrame chính thức của YouTube, không tải hay lưu video.
- Tra từ ngay trong câu: nghĩa, từ loại/ngữ pháp, hoàn cảnh sử dụng, ví dụ.
- Lưu từ vựng và ghi chú video vào kho cá nhân.

### Luyện viết chữ Hán
- Tích hợp **HanziWriter**: hiển thị đúng thứ tự nét, tự chấm đúng/sai từng nét, có hoạt ảnh minh hoạ mẫu.

### Trắc nghiệm và Đạo Lộ (Ải luyện tập)
- Tạo bộ câu hỏi trắc nghiệm, chỉnh sửa và luyện tập theo từng **Ải**.
- Nhập đề từ file Word (`.docx`) thông qua `mammoth`.
- **Đạo Lộ Tu Luyện Chi Lộ**: lộ trình ôn tập theo chặng, tính điểm theo thời gian luyện trong ngày và theo chủ đề thành thạo.

### Ôn từ vựng ngắt quãng (SRS)
- Lịch ôn thích ứng theo mức độ nhớ, lưu **offline-first** trong `localStorage` và đồng bộ lên Firestore.
- Nhật ký học theo ngày, nhiệm vụ ngày, chuỗi ôn tập và kỷ lục.

### Trợ lý AI
- Dịch, giải thích bằng **Google Gemini**, gọi trực tiếp từ trình duyệt bằng khoá API do chính người dùng cung cấp.

### Cộng đồng
- **Thiên Bảng**: bảng xếp hạng theo mùa.
- **Tông Môn (Guild)**: lập hoặc gia nhập môn phái, kinh nghiệm môn phái, bảng xếp hạng môn phái.
- Kết bạn, hồ sơ công khai, hộp thư, cửa hàng vật phẩm và kho đồ (bằng tiền tệ ảo).

---

## Hệ thống game hoá

| Tài nguyên | Ý nghĩa |
|---|---|
| 💎 **Linh Thạch** (Spirit) | Tiền tệ ảo, kiếm khi hoàn thành Ải, dùng để mua vật phẩm và khôi phục chuỗi |
| ⭐ **Danh Vọng** (Fame) | Điểm uy tín ảo, dùng cho một số quyền lợi và khôi phục chuỗi |
| 🏆 **Điểm mùa** | Xếp hạng theo mùa, đặt lại định kỳ |
| 🔥 **Chuỗi điểm danh** | Học liên tục mỗi ngày để lên danh hiệu: Phàm Nhân, Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần |

Mọi tài nguyên đều là **tiền tệ ảo**, không quy đổi ra tiền thật. Ứng dụng không cấp văn bằng hay chứng chỉ.

---

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Giao diện | React 18 (UMD), Tailwind CSS (CDN), CSS tuỳ chỉnh |
| Biên dịch | esbuild (JSX sang JS) |
| Backend / Dữ liệu | Firebase Authentication, Cloud Firestore |
| AI | Google Gemini API |
| Thư viện | HanziWriter, mammoth, LZ-String |
| Hosting | GitHub Pages |

---

## Cấu trúc thư mục

```
.
├── index.html          # Khung trang, nạp thư viện CDN
├── dieu-khoan.html     # Điều khoản dịch vụ và chính sách bảo mật
├── firestore.rules     # Quy tắc bảo mật Firestore
├── build.sh            # Biên dịch js/app.jsx -> js/app.min.js
├── css/
│   └── styles.css
└── js/
    ├── boot.js
    ├── app.jsx         # Mã nguồn chính (chỉnh sửa tại đây)
    └── app.min.js      # Bản đã biên dịch
```

---

## Chạy trên máy

```bash
git clone https://github.com/<tai-khoan>/<ten-repo>.git
cd <ten-repo>
python -m http.server 8080
```

Mở `http://localhost:8080`. Không mở trực tiếp bằng `file://`.

---

## Cấu hình Firebase

1. Tạo dự án Firebase, bật **Authentication** (Email/Password, Google) và **Cloud Firestore**.
2. Thay `firebaseConfig` ở đầu `js/app.jsx` bằng cấu hình của bạn.
3. Thêm domain triển khai vào **Authentication → Settings → Authorized domains**.
4. Dán nội dung `firestore.rules` vào **Firestore → Rules** rồi Publish.

---

## Build và triển khai

```bash
npm i -g esbuild
./build.sh
git add .
git commit -m "feat: mô tả thay đổi"
git push origin main
```

GitHub Pages cập nhật sau 1 đến 2 phút. Nhấn `Ctrl + F5` để xoá cache.

---

## Bảo mật và pháp lý

- Khoá Gemini API lưu ở `users/{uid}/private/settings` hoặc `localStorage`, không nằm trong hồ sơ công khai.
- Chỉ nhúng YouTube qua IFrame chính thức, không tải/lưu video hay âm thanh.
- Dự án phi thương mại, không có cổng thanh toán. Xem [dieu-khoan.html](dieu-khoan.html).
- Tài nguyên game hiện còn tính ở phía client; nên chuyển sang Cloud Functions để chống gian lận.

---

## Lộ trình

- [ ] Chuyển tính toán tài nguyên sang Cloud Functions
- [ ] Bộ lọc từ khoá và chức năng báo cáo nội dung cộng đồng
- [ ] Tách `app.jsx` thành các module
- [ ] Chuyển sang Vite và biên dịch Tailwind tại build-time
- [ ] Đóng gói Android/iOS bằng Capacitor

---

## Đóng góp

1. Fork và tạo nhánh mới: `git checkout -b feat/ten-tinh-nang`
2. Commit theo quy ước: `feat:`, `fix:`, `refactor:`, `docs:`
3. Mở Pull Request kèm mô tả và ảnh chụp màn hình nếu đổi giao diện

---

## Giấy phép


