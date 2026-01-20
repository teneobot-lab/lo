
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
      // Inject API_KEY from System Environment (Vercel) or .env file
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Safe fallback for other process.env calls
      'process.env': {} 
    },
    build: {
      outDir: 'dist',
    }
  };
});
