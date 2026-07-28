import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures relative asset paths so the site works on GitHub Pages without blank screen
  plugins: [
    react(),
    tailwindcss()
  ],
});
