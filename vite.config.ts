/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Type declarations are emitted separately by `tsc -p tsconfig.build.json` (see the build script).
export default defineConfig({
  base: '/react-marketing-tools/',
  build: {
    minify: true,
    reportCompressedSize: true,
    lib: {
      // ESM-only (decision D6). `index` = core + React bindings; `core` = framework-agnostic;
      // `server` = Measurement Protocol + Conversions API for Node and edge runtimes;
      // `fingerprintjs` = the optional FingerprintJS visitor-ID adapter; `webVitals` = Core Web Vitals reporting.
      entry: {
        index: resolve(import.meta.dirname, 'lib/index.ts'),
        core: resolve(import.meta.dirname, 'lib/core.ts'),
        server: resolve(import.meta.dirname, 'lib/server.ts'),
        fingerprintjs: resolve(import.meta.dirname, 'lib/fingerprintjs.ts'),
        webVitals: resolve(import.meta.dirname, 'lib/webVitals.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Optional peers: resolved by the app's bundler, only in apps that import `react-marketing-tools/fingerprintjs`
      // or `react-marketing-tools/web-vitals`.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@fingerprintjs/fingerprintjs',
        'web-vitals',
      ],
      output: {
        // Unhashed shared-chunk names: npm versions the files, and size budgets need stable paths.
        chunkFileNames: 'chunks/[name].js',
        // Marks the React entry as a client module for React Server Components (Next.js App Router).
        // Directives in source are stripped by the bundler, so it is added to the output instead.
        banner: chunk => (chunk.name === 'index' ? "'use client'" : ''),
      },
    },
  },
  test: {
    // Default to Node; DOM-dependent test files opt in with `// @vitest-environment jsdom`.
    environment: 'node',
    include: [
      'lib/**/*.test.{ts,tsx}',
      'demo/**/*.test.{ts,tsx}',
      'scripts/**/*.test.mjs',
    ],
    // The playground imports the library by its package name, as an app would (see demo/vite.config.ts).
    alias: [
      {
        find: /^react-marketing-tools$/,
        replacement: resolve(import.meta.dirname, 'lib/index.ts'),
      },
    ],
  },
})
