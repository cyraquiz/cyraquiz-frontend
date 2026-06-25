import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Lazy-only libs — go with their page chunk, not vendor
          if (id.includes('node_modules/canvas-confetti')) return undefined;
          if (id.includes('node_modules/use-sound')) return undefined;
          if (id.includes('node_modules/howler')) return undefined;
          if (id.includes('node_modules/@dnd-kit')) return undefined;
          // Co-bundle Join + StudentLobby: sin descarga extra al navegar al lobby
          if (id.includes('src/pages/Join') || id.includes('src/pages/StudentLobby')) return 'Join';
if (id.includes('node_modules/qrcode')) return 'qr';
          // Fixed chunks
          if (id.includes('node_modules/socket.io-client')) return 'socket';
          // React core together to avoid circular chunk dep (react-dom ↔ scheduler ↔ vendor)
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules/react-is/')
          ) return 'react-vendor';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})
