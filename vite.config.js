import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Relative assets support both user sites and project subdirectories.
export default defineConfig({ plugins: [react(), tailwindcss()], base: './' });
