import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000, // Increase limit to 2MB to suppress warnings for Firebase/XLSX
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/firestore', 'firebase/auth'],
        },
      },
    },
  },
});