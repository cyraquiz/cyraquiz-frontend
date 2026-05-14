import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Estas libs solo se usan en páginas lazy → van con su chunk, no en vendor
          if (id.includes('node_modules/canvas-confetti')) return undefined;
          if (id.includes('node_modules/use-sound')) return undefined;
          if (id.includes('node_modules/howler')) return undefined;
          // Chunks fijos
          if (id.includes('node_modules/socket.io-client')) return 'socket';
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})
