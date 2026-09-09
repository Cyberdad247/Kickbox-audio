import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  define: {
    'process.env': {},
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Camelot OS',
        short_name: 'Camelot',
        description: 'Sovereign Multi-Tenant Enclave',
        theme_color: '#050507',
        background_color: '#050507',
        display: 'standalone',
      },
    }),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/bifrost-ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
      },
      '/live': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['zod'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
