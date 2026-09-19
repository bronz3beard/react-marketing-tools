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
      // ESM-only (decision D6). `index` still exports the 0.4 API until the React bindings replace it (batch B6).
      entry: {
        index: resolve(import.meta.dirname, 'lib/index.tsx'),
        core: resolve(import.meta.dirname, 'lib/core.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
  test: {
    // Default to Node; DOM-dependent test files opt in with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['lib/**/*.test.{ts,tsx}'],
  },
})
