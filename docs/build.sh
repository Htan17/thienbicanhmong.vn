#!/bin/sh
# Biên dịch + gói src/main.jsx (và mọi module) -> js/app.min.js. Cần: npm i  (esbuild nằm trong devDependencies)
# React/Firebase/LZString/mammoth vẫn nạp bằng thẻ <script> CDN trong index.html (biến toàn cục), nên KHÔNG đóng gói vào đây.
set -e
cd "$(dirname "$0")"
ESBUILD="${ESBUILD:-esbuild}"
command -v "$ESBUILD" >/dev/null 2>&1 || ESBUILD="npx esbuild"
$ESBUILD src/main.jsx --bundle --format=iife --loader:.jsx=jsx --target=es2019 --minify --legal-comments=none --outfile=js/app.min.js
echo "Đã build js/app.min.js"
