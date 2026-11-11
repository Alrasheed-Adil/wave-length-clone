import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, '../shared/src') },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true } },
  },
});
