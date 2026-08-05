import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Workaround for Rolldown (Vite 8) bug: exports from api.js get dropped
    // when merged into the shared index chunk, causing "X is not a function".
    // Isolating api.js into its own chunk keeps its exports intact.
    minify: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase/')) return 'firebase';
          if (id.includes('node_modules/chart.js/')) return 'chart';
          if (id.includes('node_modules/@capacitor/')) return 'vendor';
          if (id.includes('/src/api.js')) return 'api';
        },
      },
    },
  },
})
