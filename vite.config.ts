import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rollupOptions: {
      // Separar las librerías pesadas para que cada archivo se pueda guardar sin conexión
      output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'], xlsx: ['xlsx'] } },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: 'CookieSnacks',
        short_name: 'CookieSnacks',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFF8F0',
        theme_color: '#F6B8CB',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
