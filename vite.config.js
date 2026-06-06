import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// The admin SPA is a SEPARATE app from the Laravel backend. In dev we proxy
// /api, /sanctum and /broadcasting to the backend so the browser treats the
// API as same-origin — this makes Sanctum's session cookie + XSRF-TOKEN flow
// work without any cross-site cookie headaches. For production, point
// VITE_API_TARGET at the real API host (or serve this build behind the same
// domain / a reverse proxy).
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/sanctum': { target: API_TARGET, changeOrigin: true },
      '/broadcasting': { target: API_TARGET, changeOrigin: true },
    },
  },
});
