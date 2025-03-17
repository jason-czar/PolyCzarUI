import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Chrome extension
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        format: 'iife', // Immediately Invoked Function Expression
        inlineDynamicImports: true,
        // Add global variables to prevent "require is not defined" errors
        intro: `
          // Chrome extension compatibility shim
          window.global = window;
          window.process = { env: { NODE_ENV: 'production' } };
          window.Buffer = { from: function() { return []; }, isBuffer: function() { return false; } };
        `
      }
    },
    target: 'esnext',
    minify: true,
  }
})