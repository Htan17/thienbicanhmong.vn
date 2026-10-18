#!/bin/sh
# Biên dịch JSX -> JS thường (cần: npm i -g esbuild). Chạy trong thư mục app/
esbuild js/app.jsx --loader:.jsx=jsx --target=es2019 --minify --legal-comments=none --outfile=js/app.min.js
