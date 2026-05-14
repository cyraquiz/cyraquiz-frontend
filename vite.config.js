import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/socket.io-client')) return 'socket';
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})
