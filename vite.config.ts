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
      // ESM-only (decision D6). `index` = core + React bindings; `core` = framework-agnostic.
      entry: {
        index: resolve(import.meta.dirname, 'lib/index.ts'),
        core: resolve(import.meta.dirname, 'lib/core.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
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
    include: ['lib/**/*.test.{ts,tsx}'],
  },
})
