import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': 'http://localhost:4000',
      '/api': 'http://localhost:4000',
    },
  },
});
