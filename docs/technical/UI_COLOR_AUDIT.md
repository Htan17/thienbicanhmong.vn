# UI_COLOR_AUDIT — rà soát và tối ưu màu giao diện (REV5)

Phương pháp: tính tương phản WCAG 2.x từ chính các luật trong `css/styles.css` (không dựa cảm tính). Mục tiêu chữ thường ≥ 4.5:1.
Nền tham chiếu: nền sáng `#ffffff`, `#f4f4f5`, nền thân trang `#e7e7ea`; nền tối `#000`, `#18181b`, `#27272a`; Học tập (be) `#f5f0e6`, `#eee6d3`, `#fdfbf6`.

## Phát hiện (trước khi sửa)
| Chỗ | Màu | Tương phản | Ghi chú |
|---|---|---|---|
| Nền sáng, `text-zinc-600` | `#a1a1aa` | 2.5:1 trên trắng | bản "lật" tự sinh làm chữ phụ gần như biến mất |
| Nền sáng, `text-zinc-500` | `#71717a` | 3.92:1 trên nền thân trang | dưới 4.5 |
| Nền sáng, chữ màu: vàng/đỏ/cam/xanh ngọc/lục/cyan | `#a16207 #dc2626 #c2410c #047857 #15803d #0e7490` | 3.9–4.4:1 trên nền thân trang | dưới 4.5 |
| Học tập (be) sáng, `text-zinc-600` / `-500` | `#a89f8a` / `#7a7260` | 2.3 / 4.2:1 | |
| Nền tối, `text-zinc-600` / `-500` (chế độ Học tập) | `#52525b` / `#71717a` | 2.7 / 4.35:1 trên đen (3.7 trên thẻ) | bản sửa cũ chỉ áp cho giao diện "thienkieu" |
| Tước hiệu chưa mở khóa (Lộ trình thi) | `text-zinc-700` | 1.5:1 (sáng) | gần như vô hình |
| Bộ sinh CSS | — | — | chỉ quét `src/App.jsx` (nay còn 268 dòng) nên chạy lại sẽ mất luật chế độ sáng/Học tập của mọi màn hình đã tách; bản chạy lại cũng không idempotent và dời khối CSS xuống cuối file (đổi thứ tự cascade) |
| Cache | — | — | `css/styles.css` không có `?v=` nên sửa màu có thể không tới người dùng |

## Đã sửa
- `tools/gen-light-theme.py`: quét toàn bộ `src/**` (bỏ test), thay khối đúng vị trí cũ, chạy nhiều lần cho cùng kết quả (đã kiểm `cmp`). Sinh thêm luật cho các class mới.
- Nền sáng: chữ màu đậm hơn — vàng `#854d0e`, đỏ `#b91c1c`, cam `#9a3412`, xanh ngọc `#046c4e`, lục `#166534`, cyan `#0b6a85` (đều ≥ 4.5 trên cả ba nền sáng); `text-zinc-500` → `#5f5f69`, `text-zinc-600` → `#64646e`; huy hiệu `lb-tab-on`, `rew-gold`, `rew-bronze` theo màu mới.
- Nền tối (mọi giao diện): `text-zinc-500` → `#9a9aa5`, `text-zinc-600` → `#8f8f9a` (≥ 4.66 trên cả ba nền tối, vẫn phân cấp được so với `zinc-400 #a1a1aa`).
- Học tập + nền be: `text-zinc-500` → `#5f594b`, `text-zinc-600` → `#6b6455`.
- `ExamPathScreen.jsx`: tước hiệu chưa mở khóa dùng `text-zinc-500 opacity-70` thay `text-zinc-700 opacity-50`.
- `tools/build.mjs`: tự ghi `css/styles.css?v=<hash>` vào `index.html`; `build:check` báo lỗi nếu quên.
- Test hồi quy `tests/uiContrast.test.mjs` (3 test): trên CSS cũ **fail 3/3 (78 vi phạm)**, trên CSS mới **pass**.

## Chưa kiểm chứng / giới hạn
- Chưa chụp ảnh giao diện thật: môi trường không có Tailwind 3.4.17 như dự án (chỉ có bản 4) và không có mạng để nạp CDN, nên màu thực tế trên màn hình **NOT VERIFIED bằng mắt**; kết quả trên là phép đo từ luật CSS.
- Chữ trên nền bão hòa (nút màu), màu viền, biểu đồ, huy hiệu vật phẩm chưa đo.
- Hover/disabled không đưa vào ngưỡng (WCAG miễn trừ disabled).
