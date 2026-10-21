#!/bin/sh
# Biên dịch JSX -> JS thường và gắn mã phiên bản để trình duyệt/GitHub Pages luôn tải bản mới.
# Cần: npm i -g esbuild. Chạy trong thư mục gốc của dự án.
set -e
esbuild js/app.jsx --loader:.jsx=jsx --target=es2019 --minify --legal-comments=none --outfile=js/app.min.js
V=$(date +%Y%m%d%H%M)
sed -i "s/?v=[0-9]*/?v=$V/g" index.html
echo "Đã build xong, phiên bản $V"
