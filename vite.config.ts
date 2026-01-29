
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://159.223.57.240:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env': {} 
    },
    build: {
      outDir: 'dist',
    }
  };
});
