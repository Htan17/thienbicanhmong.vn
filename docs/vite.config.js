// Vite cho môi trường dev (HMR) và build. React/Firebase vẫn là biến toàn cục từ CDN (index.html) nên dùng chế độ IIFE giống build.sh.
import { defineConfig } from 'vite';
export default defineConfig({
  esbuild: { jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', loader: 'jsx', include: /src\/.*\.jsx?$/ },
  css: { postcss: './postcss.config.cjs' },
  build: {
    target: 'es2019', outDir: 'js', emptyOutDir: false, copyPublicDir: false,
    lib: { entry: 'src/main.jsx', formats: ['iife'], name: 'ThienKieu', fileName: () => 'app.min.js' },
  },
});
