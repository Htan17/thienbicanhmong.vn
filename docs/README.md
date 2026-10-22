# Thiên Kiêu Bí Cảnh

> Web app học ngoại ngữ qua video YouTube, được "game hoá" theo phong cách tu tiên: xem video có phụ đề song ngữ, tra từ, luyện viết chữ Hán, làm bài trắc nghiệm, ôn từ vựng ngắt quãng, thi đua trên bảng xếp hạng và lập môn phái.

> **Điều khoản & Chính sách bảo mật:** bằng việc tạo tài khoản hoặc sử dụng ứng dụng, bạn đồng ý với [Điều Khoản Dịch Vụ và Chính Sách Bảo Mật](dieu-khoan.html). Đây là dự án **phi thương mại**, không bán hàng hoá/dịch vụ, không cấp văn bằng hay chứng chỉ; Linh Thạch và Danh Vọng là tiền tệ ảo, không quy đổi ra tiền thật.

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

### Học môn học qua video (Toán, Lý, Hóa, Sinh, Sử, Địa...)
- Không chỉ ngoại ngữ: chế độ **🤖 Tự nhận biết** của AI sẽ chọn cấu trúc phù hợp (hoặc tự chọn 🌏 Ngoại ngữ / 📚 Môn học).
- Với video môn học, thay cột Pinyin/nghĩa bằng: **Mục lục theo mốc thời gian** (bấm mục là video tự tua tới đó), **Công thức & Định lý**, Ý chính, Ví dụ trong video.
- **Ải Bí Tịch** sinh tự động bằng đúng cấu trúc Bí Tịch thường, được lưu ở **Tàng Kinh Các (Trang chủ)** thay vì mục Học Video.
- Hiện chỉ hỗ trợ link YouTube (nhúng bằng IFrame chính thức); không hỗ trợ TikTok.

### Luyện viết chữ Hán
- Tích hợp **HanziWriter**: hiển thị đúng thứ tự nét, tự chấm đúng/sai từng nét, có hoạt ảnh minh hoạ mẫu.

### Trắc nghiệm và Đạo Lộ (Ải luyện tập)
- Tạo bộ câu hỏi trắc nghiệm, chỉnh sửa và luyện tập theo từng **Ải**.
- Nhập đề từ file Word (`.docx`) thông qua `mammoth`.
- **Đạo Lộ Tu Luyện Chi Lộ**: lộ trình ôn tập theo chặng, tính điểm theo thời gian luyện trong ngày và theo chủ đề thành thạo.
- **Kho Đạo Lộ**: lưu tối đa 5 Đạo Lộ cùng lúc, chuyển qua lại mà không mất tiến độ.

### Ôn từ vựng ngắt quãng (SRS)
- Lịch ôn thích ứng theo mức độ nhớ, lưu **offline-first** trong `localStorage` và đồng bộ lên Firestore.
- Nhật ký học theo ngày, nhiệm vụ ngày, chuỗi ôn tập và kỷ lục.

### Trợ lý AI
- Dịch, giải thích bằng **Google Gemini**, gọi trực tiếp từ trình duyệt bằng khoá API do chính người dùng cung cấp.
- Tự động thử lần lượt nhiều mô hình Gemini (3.8, 3.7, 3.6, 3.5, 3.1 Flash-Lite, 2.5...) và 2 khoá API; người dùng có thể chọn mô hình ưu tiên.

### Cộng đồng
- **Phong Thần Bảng** (xếp hạng theo mùa, kiểu Duolingo): chỉ người đã học tối thiểu 3 bài trong mùa mới lên bảng và đủ điều kiện nhận thưởng. Giao diện có bục vinh danh Top 3, thanh hạng của bạn luôn hiện ở cuối danh sách, thanh tiêu đề tự đổi tên theo màn hình.
- **Tông Môn (Guild)**: lập hoặc gia nhập môn phái, kinh nghiệm môn phái, bảng xếp hạng môn phái.
- Mã Bí Tịch chia sẻ ngắn 8 ký tự (Tàng Kinh Các và video), nhập mã có thông báo kết quả rõ ràng.
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
├── index.html            # Khung trang, nạp thư viện CDN
├── dieu-khoan.html       # Điều khoản dịch vụ và chính sách bảo mật
├── firestore.rules       # Quy tắc bảo mật Firestore (gồm admins/reports/hiddenContent)
├── build.sh              # Gói src/ -> js/app.min.js (esbuild)
├── package.json, vite.config.js, tailwind.config.cjs, postcss.config.cjs
├── css/styles.css
├── js/boot.js, js/app.min.js   # app.min.js là bản đã build (sửa ở src/)
├── src/
│   ├── main.jsx          # điểm vào (thứ tự import quan trọng)
│   ├── App.jsx           # component chính ThienKieuApp
│   ├── config/           # firebase, hằng số, dữ liệu game
│   ├── lib/              # contentFilter, moderation, gemini, srs, audio, helpers...
│   └── components/       # ReportModal, ModerationPanel, SuPhuHub...
├── tests/                # npm test
└── tools/                # split-app.cjs, apply-app-edits.py, check-globals.cjs
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
npm i
npm test               # kiểm thử bộ lọc + kiểm duyệt
npm run check:globals  # phát hiện biến chưa khai báo
./build.sh
git add .
git commit -m "feat: mô tả thay đổi"
git push origin main
```

GitHub Pages cập nhật sau 1 đến 2 phút. Nhấn `Ctrl + F5` để xoá cache.

---

## Quy tắc phát triển (bắt buộc khi thêm tính năng)

1. **Khoá API:** không lưu khoá Gemini của người dùng vào tài liệu công khai `users/{uid}`; chỉ lưu ở `users/{uid}/private/settings` hoặc `localStorage`. Gọi AI trực tiếp từ trình duyệt bằng khoá của chính người dùng.
2. **Bản quyền YouTube:** chỉ nhúng bằng trình phát IFrame chính thức; không viết mã tải, lưu, sao chép hay trích xuất video/âm thanh.
3. **An ninh mạng:** mọi ô nhập văn bản công khai (tên tông môn, Bí Tịch, chat...) phải qua bộ lọc từ khoá (`isContentBlocked`) và có cơ chế báo cáo/ẩn nội dung vi phạm.
4. **Phi thương mại:** không cổng thanh toán, không nạp/bán khoá học; chỉ dùng tiền ảo Linh Thạch. Thuật ngữ thi cử theo hướng "trò chơi hoá bổ trợ tự học", không khẳng định cấp văn bằng/chứng chỉ.
5. **Tài liệu:** mỗi lần thêm tính năng phải cập nhật `README.md` và `dieu-khoan.html`; đổi code `app.jsx` xong chạy `build.sh`; đổi quyền dữ liệu thì cập nhật `firestore.rules`.

## Thiết lập quản trị viên (kiểm duyệt)

1. Dán `firestore.rules` mới vào Firestore → Rules và Publish.
2. Trong Firebase Console → Firestore, tạo collection `admins`, thêm tài liệu có **ID = UID của tài khoản quản trị** (nội dung rỗng/tuỳ ý). Client không ghi được collection này.
3. Đăng nhập bằng tài khoản đó: Hồ Sơ sẽ có nút **🛡️ BẢNG QUẢN TRỊ** (duyệt báo cáo, ẩn/khôi phục).
4. Người dùng báo cáo ở: hồ sơ đạo hữu, tông môn, Bí Tịch nhận từ mã (nút 🚩 trong Tàng Kinh Các).

Lưu ý: ẩn đạo hữu/tông môn được che ở giao diện (dữ liệu vẫn được tải về); ẩn Bí Tịch/video chia sẻ được máy chủ chặn thật qua rules.

## Bảo mật và pháp lý

- Khoá Gemini API lưu ở `users/{uid}/private/settings` hoặc `localStorage`, không nằm trong hồ sơ công khai.
- Chỉ nhúng YouTube qua IFrame chính thức, không tải/lưu video hay âm thanh.
- Dự án phi thương mại, không có cổng thanh toán. Người dùng phải tick đồng ý [Điều khoản](dieu-khoan.html) khi tạo tài khoản; liên kết điều khoản cũng có ở màn đăng nhập và cuối trang Hồ sơ.
- Tài nguyên game hiện còn tính ở phía client; nên chuyển sang Cloud Functions để chống gian lận.

---

## Lộ trình

- [ ] Chuyển tính toán tài nguyên sang Cloud Functions (kể cả mã quà tặng và thưởng cuối mùa)
- [x] Bộ lọc từ khoá v2: chuẩn hoá Unicode, chống né lọc, 7 nhóm nội dung, tên dành riêng, chặn liên kết/SĐT (`src/lib/contentFilter.js`, có test)
- [x] Báo cáo/ẩn nội dung cộng đồng cho quản trị viên (`src/lib/moderation.js`, Bảng Quản Trị trong Hồ Sơ, `firestore.rules`)
- [x] Tách `app.jsx` thành module ES (`src/`); còn có thể tách tiếp `App.jsx` (component ~4.600 dòng) theo từng màn hình
- [~] Vite + Tailwind build-time: đã có `vite.config.js`, `tailwind.config.cjs`, `postcss.config.cjs`, `npm run build:css` (cần `npm i` có mạng để chạy lần đầu)
- [ ] Đóng gói Android/iOS bằng Capacitor

---

## Đóng góp

1. Fork và tạo nhánh mới: `git checkout -b feat/ten-tinh-nang`
2. Commit theo quy ước: `feat:`, `fix:`, `refactor:`, `docs:`
3. Mở Pull Request kèm mô tả và ảnh chụp màn hình nếu đổi giao diện

---

## Giấy phép

Chọn và ghi rõ giấy phép (ví dụ MIT) trong file `LICENSE`.

---

## Nhật ký tối ưu gần nhất (22/10/2026)

Gói này là bản **gộp và tối ưu** từ nhiều bản tải lên trước đó (các bản Vite/React `-5`, `-6` và các bản đơn file `app.jsx` cũ hơn). Chi tiết đầy đủ nằm trong file Word đi kèm, tóm tắt:

- **Khôi phục 2 tính năng bị thiếu khi chuyển sang kiến trúc Vite (-5/-6) so với bản đơn file cũ:** chế độ giao diện "📘 Học tập" (nghiêm túc, tự đổi thuật ngữ tu tiên sang tiếng phổ thông) / "🏯 Bí Tịch" (mặc định), và chế độ "🌙 Tối / ☀️ Sáng / 🖥️ Tự động theo hệ thống". Đã ghép lại `js/boot.js`, thêm state + nút bấm ở màn Đăng Nhập và Hồ Sơ trong `src/App.jsx`, và chạy lại `tools/gen-light-theme.py` để sinh đúng CSS cho giao diện sáng/học tập khớp với mã nguồn hiện tại (không copy nguyên bản CSS cũ). Đã build thử bằng esbuild và chạy `npm test` (11/11 pass) để xác nhận không có lỗi.

- Dùng bản kiến trúc Vite/React mới nhất (`src/`) làm bản gốc duy nhất; bỏ các bản `app.jsx` đơn file đã lỗi thời và file zip lồng trong zip.
- Xoá thư mục rác `src/{lib,config,components}` (lỗi tạo thư mục khi đóng gói trước đó, không có tác dụng).
- Thêm `preconnect`/`dns-prefetch` cho các CDN và API ngoài (Firebase, unpkg, jsDelivr, cdnjs, Google Fonts) trong `index.html` để trình duyệt kết nối sớm, rút ngắn thời gian tải trang lần đầu.
- Cập nhật `dieu-khoan.html`: bổ sung điều khoản cho tính năng Luyện Viết Chữ Hán (HanziWriter chạy cục bộ, không ghi/lưu hình), cập nhật ngày hiệu lực.
- **Khuyến nghị tiếp theo (chưa áp dụng vì cần chạy `npm install` với mạng, không thực hiện được trong môi trường tạo gói này):** chuyển Tailwind từ CDN runtime (`cdn.tailwindcss.com`) sang biên dịch sẵn lúc build bằng `npm run build:css` rồi đổi sang `<link rel="stylesheet" href="css/tailwind.css">` — giảm đáng kể JS phải chạy khi mở trang và bỏ cảnh báo "should not be used in production". Sau đó chạy `npm install && npm run build` để build lại `js/app.min.js` mới nhất từ `src/`.
