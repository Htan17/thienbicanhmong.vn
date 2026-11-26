# GIAI ĐOẠN 2 — QUIZ ENGINE V2 (4 loại câu + PHẦN I–IV) + cập nhật Điều khoản & Rules

Bản này gồm toàn bộ dự án V10 + Giai đoạn 1 (DOCX Preview: sửa/xóa câu) + Giai đoạn 2. Đã build lại `js/app.min.js`.

## 1. Có gì mới

| Hạng mục | Nội dung |
|---|---|
| 4 loại câu | `single` (PHẦN I) · `truefalse` (PHẦN II) · `short` (PHẦN III, đáp án số **hoặc chữ**) · `essay` (PHẦN IV) |
| Tương thích | `multi` = `truefalse` kiểu cũ, `numeric` = `short` kiểu cũ: **không migrate, không sửa dữ liệu cũ**, Bí Tịch cũ chạy y như trước (cùng thứ tự xáo trộn, cùng cách chấm, cùng thưởng) |
| Chấm điểm | `src/quiz-v2/quizScoringConfig.js` — cấu hình tập trung, UI không hard-code trọng số. Đúng/Sai chấm theo từng ý (hoặc `allOrNothing`, hoặc bảng `table`: 1 ý 10% · 2 ý 25% · 3 ý 50% · 4 ý 100%) |
| Trả lời ngắn | Số: số âm, thập phân, dấu `,`/`.`, sai số `tolerance` (mặc định 0.01 như điền số cũ). Chữ: so khớp **chính xác** với `c` hoặc `acceptedAnswers[]` sau khi chuẩn hóa Unicode NFC + khoảng trắng + (tùy chọn) hoa/thường. **Không** bỏ dấu tiếng Việt, **không** so mờ |
| Tự luận | Nhập bài → Nộp → (tùy chọn) AI **gợi ý** điểm theo rubric. Điểm AI luôn `official:false`, **không** cộng vào tổng chính thức, **không** vào mastery/nghiên cứu, **không** tính thưởng |
| Màn kết quả | Bảng điểm theo phần + "Tổng chính thức" (PHẦN I–III) tách riêng "AI gợi ý" (PHẦN IV) |
| ALEP | Mỗi lượt ghi `questionType` (single/truefalse/short/essay — `multi`/`numeric` cũ tự đổi tên, giữ `legacyType`), `sectionId`; tự luận không vào mastery; thêm `buildTypeProfiles()` phân tích theo loại câu |
| DOCX | Nhận tiêu đề PHẦN I–IV (cả DOCX **chỉ chữ**), xem trước gom theo phần, đổi loại / chuyển phần / thêm câu / xóa câu, không mất ảnh |
| Điều khoản & Rules | Xem mục 5 |

## 2. Quy ước viết đề DOCX

```
PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN
Câu 1: ...?            (A. B. C. D. rồi "Đáp án: B")
PHẦN II. ĐÚNG / SAI
Câu 1: ...             (A. B. C. D. rồi "Đáp án: A Đúng, B Sai, C Đúng, D Sai"  hoặc  "A-Đ, B-S, ...")
PHẦN III. TRẢ LỜI NGẮN
Câu 1: ...             ("Đáp án: -2,75"  hoặc  "Đáp án: Hà Nội; Thủ đô Hà Nội"; tùy chọn dòng "Sai số: 0,1")
PHẦN IV. TỰ LUẬN
Câu 1: ... (3 điểm)    (dòng "Rubric:" rồi mỗi tiêu chí một dòng "- Nêu đúng khái niệm (2 điểm)";
                        "Đáp án mẫu: ..."; hoặc "Điểm tối đa: 3")
```
* Tiêu đề phần là **tín hiệu mạnh nhất**. Nếu cách ghi đáp án mâu thuẫn với phần (vd PHẦN I mà đáp án là "A,C") câu được đánh dấu **Chưa xác định** để bạn chọn lại, không tự ép.
* Không có tiêu đề phần: dùng bộ nhận diện của Giai đoạn 1 (heuristic + cảnh báo "cần kiểm tra").
* Bản xem trước nhóm câu theo PHẦN I → IV; đổi loại hoặc dùng "↪ Chuyển câu sang phần khác…" thì câu tự sang nhóm mới, số thứ tự đánh lại, **ảnh giữ nguyên**, câu chuyển phần buộc xác nhận lại đáp án.

## 3. Cấu trúc dữ liệu câu (đã lưu)

```js
{ q, o, c, type, sectionId, img, images, index, parseConfidence, requiresReview,
  // theo loại:
  // single    : o[2..6], c = chỉ số đáp án
  // truefalse : o[2..6] các ý, c = mảng chỉ số các ý ĐÚNG (giống multi cũ)
  // short     : o = [] (hoặc nội dung kèm theo), c = '12.5' | 'Hà Nội',
  //             answerType:'number'|'text', tolerance?, acceptedAnswers?[], caseSensitive?
  // essay     : o = [], c = '', rubric?[{text,points}] | chuỗi, maxScore?, sampleAnswer? }
```
`sectionId`: `multiple_choice | true_false | short_answer | essay`. Bí Tịch vẫn lưu `data` **phẳng** (không nhân đôi dữ liệu); `getQuizSections()` dựng cấu trúc `sections[{id,title,type,questions}]` khi cần, `flattenQuiz()` đọc ngược.

## 4. Các tệp

Mới: `src/quiz-v2/` (questionTypes, quizScoringConfig, shortAnswer, essayRubric, quizSections, validateQuestion + test) · `src/components/quiz-v2/QuizV2Panels.jsx` · `src/docx-import/docxSectionParser.js` · `src/adaptive/typeProfile.js` · test `docxPhase2.test.js`, `typeProfile.test.js`.
Sửa: `src/App.jsx` (xáo/chạy theo phần, chấm ngắn/tự luận, thưởng không tính tự luận, kết quả theo phần, nhập DOCX chữ thuần có PHẦN, trình sửa Bí Tịch hỗ trợ 4 loại, kiểm duyệt cả rubric/bài mẫu) · `docx-import/*` · `components/docx-import/*` · `adaptive/{adaptiveTypes,adaptiveSession,masteryCalculator}.js` · `dieu-khoan.html` · `firestore.rules` · `js/app.min.js`.
Bản gốc trước khi sửa: `quiz-engine-v2/backup_truoc_GD2/`.

## 5. Điều khoản & Rules

* `dieu-khoan.html` (cập nhật 06/11/2026): thêm (mục 2) dữ liệu phân tích học tập lưu trên thiết bị và bài tự luận không được lưu; (mục 3) AI chỉ **gợi ý** điểm tự luận, không chính thức, bài làm gửi tới Google bằng khóa của người dùng; (mục 4) trách nhiệm nội dung đề DOCX, kiểm duyệt cả rubric/đáp án/bài mẫu, mã chia sẻ chứa toàn bộ đáp án.
* `firestore.rules`: `quizShares` khi tạo phải có `t` là chuỗi ≤ 300 ký tự, `d` là danh sách 1–500 câu, `createdAt` là số. Rules **cố ý không** liệt kê loại câu/trường (không duyệt được từng phần tử, và sẽ làm hỏng Bí Tịch cũ); kiểm tra cấu trúc từng câu do `validateQuestionV2` làm ở máy khách.
* **Việc cần làm tay:** triển khai rules: `firebase deploy --only firestore:rules`; đẩy `dieu-khoan.html` lên hosting cùng bản build.

## 6. Kiểm tra

```
node --test src/docx-import/*.test.js src/quiz-v2/*.test.js src/adaptive/*.test.js   # 90 test
node --test tests/*.test.mjs                                                         # 11 test (dự án gốc)
sh build.sh && node tools/check-globals.cjs
```

## 7. Giới hạn đã biết / đề nghị thử trên thiết bị thật

* Chưa chạy được trình duyệt thật trong môi trường tạo bản này: logic được kiểm bằng test + build thành công; hãy thử tay một lượt: nhập DOCX có PHẦN I–IV, làm 1 Bí Tịch V2, nộp tự luận + xin AI gợi ý, và mở lại 1 Bí Tịch cũ.
* Bản chạy cũ (chưa cập nhật) mở Bí Tịch V2 sẽ không hiển thị được câu `short`/`essay`: hãy cập nhật cùng lúc cho mọi người dùng.
* Điểm tự luận do người học tự chấm/giáo viên xác nhận (`scoreVerified`) chưa có giao diện; dữ liệu đã chừa chỗ.
* Câu Đúng/Sai mới không xáo thứ tự ý A–D (đúng kiểu đề thi); `multi` cũ vẫn xáo như trước.
* Ảnh lưu `img` + `images` như Giai đoạn 1 (có trùng base64 ở ảnh đầu) để tương thích Quiz Engine hiện tại.
* Quay lui: chép lại 4 tệp trong `backup_truoc_GD2/` (và xóa `src/quiz-v2`, `components/quiz-v2`) rồi `sh build.sh`.
