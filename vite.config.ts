import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/liver-workbench/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Liver Workbench',
        short_name: 'Liver Workbench',
        description: '肝疾患診療を支援するオフライン対応ワークベンチ',
        theme_color: '#176b4d',
        background_color: '#f3f7f4',
        display: 'standalone',
        start_url: '/liver-workbench/',
        scope: '/liver-workbench/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
});
