import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://178.128.106.33:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  define: {
    'process.env': 'window.process.env'
  },
  build: {
    outDir: 'dist',
  }
});