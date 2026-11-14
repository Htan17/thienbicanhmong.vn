# DEPENDENCY_SECURITY_AUDIT
**Trạng thái: BLOCKED — chưa phân loại được từng lỗ hổng.** Phiên này không có mạng nên không chạy được `npm ci`/`npm audit`. Không có số liệu audit mới; những con số dưới đây là báo cáo từ máy Windows của chủ dự án.

| Package | Số liệu báo cáo | Trạng thái |
|---|---|---|
| Frontend (root) | 27 lỗ hổng: 15 moderate, 11 high, **1 critical**; 752 package | NOT VERIFIED — chưa biết package nào, direct hay transitive, có chạm đường chạy thật không |
| `functions/` | 8 moderate; 241 package | NOT VERIFIED |

Quan sát đã xác minh từ `package.json`: toàn bộ hạng mục root là **devDependencies** (esbuild, tailwindcss, postcss, autoprefixer, vite, firebase, firebase-tools, @firebase/rules-unit-testing, typescript). Ứng dụng chạy trong trình duyệt dùng React/Firebase/LZString/mammoth nạp từ CDN (index.html), nên phần lớn cảnh báo ở root nhiều khả năng nằm trong công cụ build/test chứ không trong sản phẩm gửi tới người dùng — **đây là giả thuyết chưa kiểm chứng**, không phải kết luận. `functions/` mới là mã chạy production.

## Quy trình phải làm (cần mạng)
```powershell
nvm use 22
npm ci ; npm audit --json > audit-root.json
cd functions ; npm ci ; npm audit --json > ../audit-functions.json ; cd ..
```
Với từng cảnh báo ghi: direct/transitive, có bản vá tương thích không, có nằm trên đường chạy thật không (devDependency chỉ build/test thì rủi ro thực tế thấp hơn nhưng vẫn ghi). **Không** chạy `npm audit fix --force`. Critical phải có đánh giá và biện pháp trước khi bán.

## Install scripts chưa được phê duyệt (esbuild, protobufjs, re2, @firebase/util…)
Chưa rà (cần tải package để đọc script). Nguyên tắc: chỉ cho phép script của package tin cậy cần thiết (esbuild cần postinstall tải binary; re2 biên dịch native và chỉ là phụ thuộc của firebase-tools), ghi lý do vào file này.

## Ghi chú phiên bản
`esbuild` đang pin `^0.25.0`; bundle trong gói này build bằng 0.28.2 (sandbox). Sau khi `npm ci` với lockfile, chạy `npm run build` lại để bundle khớp phiên bản pin.
