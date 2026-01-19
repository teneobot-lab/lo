
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows code like `process.env.API_KEY` to work in the browser
    // by mapping it to the window.process shim we defined in index.html
    'process.env': 'window.process.env'
  },
  build: {
    outDir: 'dist',
  }
});
