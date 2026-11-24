import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __DATA_VERSION__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl', 'topojson-client'],
          react: ['react', 'react-dom', 'lucide-react'],
        },
      },
    },
  },
});
