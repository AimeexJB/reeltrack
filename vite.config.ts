import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from aimeeredmond.com/reeltracker/ in production (BASE_PATH is set in the Cloudflare build).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    // Lets us write `@/components/...` instead of long relative paths.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5174 },
});
