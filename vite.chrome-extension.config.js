import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: './', // Use relative paths
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife', // Immediately Invoked Function Expression
        inlineDynamicImports: true,
        // Ensure proper handling of require statements
        intro: `
          // Chrome extension compatibility shim
          const global = window;
          const process = { env: { NODE_ENV: 'production' }, browser: true };
          function require(mod) { 
            console.warn('Module required:', mod); 
            return {}; 
          }
        `,
      },
    },
    target: 'esnext',
    minify: true,
  },
})
