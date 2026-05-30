// ============================================================================
// vite.config.js  —  Frontend dev server + build config
// ----------------------------------------------------------------------------
// PURPOSE
//   Configures Vite for our pure-JavaScript React app. No TypeScript step.
//   Vite handles JSX in .jsx files natively via @vitejs/plugin-react.
//
// WHY a /api proxy?
//   The browser refuses cross-origin requests by default. In dev the FE
//   runs on :5173 and the BE on :3000. Two options:
//     a) Configure CORS on the BE for localhost:5173. (We did — see
//        server.js — and `credentials:true` lets the refresh cookie
//        flow correctly.)
//     b) Proxy /api → BE so the browser sees a single origin.
//   We use BOTH for redundancy: dev uses the proxy (same-origin, no
//   pre-flight overhead), production uses CORS (FE & BE on separate
//   hostnames behind Nginx in Phase 10).
//
// changeOrigin
//   Rewrites the Host header to match the target. Required when the BE
//   inspects req.hostname or generates Set-Cookie with a Domain attr.
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Replicate __dirname for ESM (Vite config is loaded as ESM).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    // `@/...` resolves to `src/...` — cleaner cross-folder imports
    // without long `../../../` chains.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true, // refuse to silently fall through to 5174 — surfaces port conflicts
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // No path rewrite — BE expects /api/v1/... verbatim.
      },
    },
  },

  build: {
    sourcemap: false,      // Disabled for production performance (saves overhead & build times)
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put recharts and d3 in their own dedicated bundle
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          // Put core framework stuff in a main vendor bundle
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-core';
          }
          // Put form/validation modules together
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod') || id.includes('node_modules/@hookform/resolvers')) {
            return 'vendor-forms';
          }
        }
      }
    }
  },
});
