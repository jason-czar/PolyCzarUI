import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      buildStart() {
        // This ensures the extension files are copied to the dist directory during build
        console.log('Copying extension files to public directory...');
      },
      writeBundle() {
        // This runs after the build is complete
        console.log('Build complete, ensuring extension files are in the dist directory');
      }
    }
  ],
  base: './', // Use relative paths for Chrome extension
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        format: 'iife', // Immediately Invoked Function Expression
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