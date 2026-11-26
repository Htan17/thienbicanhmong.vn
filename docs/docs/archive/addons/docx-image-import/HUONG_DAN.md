# DOCX IMAGE IMPORT (bản thử nghiệm) – nhập DOCX có ảnh nhúng

## Cách hoạt động
1. Tải file .docx ở "Tải Ngọc Giản" như cũ. DOCX **không có ảnh** hoặc file **TXT** -> chạy đúng luồng cũ (AI/parser cũ), không đổi gì.
2. DOCX **có ảnh** (phát hiện qua thư mục word/media trong file): đọc bằng mammoth.convertToHtml, giữ MIME thật, ghép ảnh theo cấu trúc tài liệu:
   - ảnh sau "Câu N" và trước "Câu N+1" thuộc Câu N (kể cả trước lựa chọn A hay sau đáp án);
   - ảnh trước Câu 1, ảnh lặp lại (nghi logo), ảnh không đọc được, hoặc khi số câu không khớp parser cũ -> vào "Ảnh chưa gắn", KHÔNG tự đoán;
   - mở màn xem trước; chưa lưu gì cho tới khi bấm "Xác nhận và lưu".
3. Luồng DOCX có ảnh KHÔNG gọi Gemini (parser cục bộ; câu nhiều đáp án nhận khi viết "Đáp án: A,C"). Gemini không quyết định ảnh thuộc câu nào.
4. Lưu giống createQuizAction (library + arrayUnion). Câu hỏi chỉ BỔ SUNG img, images (+ id); q, o, c, type giữ nguyên.

## Giới hạn (bản thử nghiệm; chỉnh trong src/docx-import/docxImportTypes.js)
- Tối đa 8 ảnh / Bí Tịch, tổng ảnh sau nén <= 600 KB; vượt thì CHẶN lưu và báo lý do.
- Có kiểm tra ngân sách hồ sơ (Firestore 1 MiB/document; mỗi Bí Tịch lưu 2 lần: data + code).
- Nén WebP (nếu trình duyệt hỗ trợ, không thì JPEG), thu nhỏ khi cạnh dài > 1000px, không cắt; PNG nền trong suốt được trải nền trắng. Ảnh gốc giữ nguyên trong bản xem trước; chỉ dùng bản nhỏ hơn.
- Màn làm bài chỉ hiện ảnh chính (img); images[] được lưu đủ.
- Mammoth không đọc: hộp văn bản/hình vẽ, công thức Word (OMML), ảnh EMF/WMF; header/footer bị bỏ qua (logo ở header tự bị loại). Ảnh không đọc được sẽ được báo, không đoán.
- Production (Firebase Storage) CHƯA làm: cần thêm script firebase-storage-compat.js và Storage Rules do bạn quyết định.

## Kiểm thử
- Tự động (trong docs/): `node --test src/docx-import/docxImport.test.js` (24 test; dùng "mammoth giả" vì Mammoth thật không chạy được ở môi trường của tôi).
- THỦ CÔNG với DOCX thật (bắt buộc):
  1. DOCX chỉ chữ -> như cũ. 2. TXT -> như cũ.
  3. DOCX 1 ảnh/câu -> xem trước đúng ảnh đúng câu; bấm ảnh để phóng to.
  4. Câu 2 ảnh -> cảnh báo "Một câu có nhiều ảnh"; "Đặt chính" đổi ảnh chính.
  5. Gỡ ảnh -> sang "Ảnh chưa gắn"; "Gán vào câu…" gắn lại.
  6. Chưa nhập tên / vượt giới hạn -> nút lưu khoá. "Hủy" -> không lưu gì.
  7. Lưu -> Bí Tịch có trong Tàng Kinh Các; làm bài thấy ảnh; bấm ảnh phóng to/kéo.

## Rollback
Chép backup_truoc_DOCX/App.jsx -> docs/src/App.jsx và app.min.js -> docs/js/app.min.js (hoặc `patch -R -p1 < App.jsx.patch` rồi build lại). src/docx-import và src/components/docx-import có thể xoá, không file cũ nào phụ thuộc.

## Vị trí sửa trong App.jsx (chỉ THÊM, 0 dòng xoá)
2 dòng import; 1 dòng state docxPreview; handleFileUpload nhánh docx: 1 khối đầu onload (chỉ chạy khi có ảnh); hàm saveDocxImportedQuiz (trước phần TU LUYỆN CHI LỘ); 1 dòng render <DocxImportPreview> trước ReportModal. Chi tiết: App.jsx.patch.
