import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts:        ['echarts', 'echarts-for-react'],
          'react-vendor': ['react', 'react-dom', 'react-router'],
          query:          ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    // Docker on Windows (bind mount) tidak trigger inotify → pakai polling
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        // Di dalam Docker container, resolve via nama service nginx
        // Di luar Docker (npm run dev dari host), ganti ke http://localhost:8085
        target: 'http://bangucup-nginx',
        changeOrigin: true,
      },
    },
  },
})
