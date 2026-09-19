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
      entry: resolve(import.meta.dirname, 'lib/index.tsx'),
      name: 'React Marketing Tools',
      // The package is "type": "module", so the UMD/CommonJS build must use .cjs or Node loads it as ESM
      // and require() returns an empty module (published 0.4.3 bug).
      fileName: format =>
        `react-marketing-tools.${format}.${format === 'umd' ? 'cjs' : 'js'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
        },
      },
    },
  },
  test: {
    // Default to Node; DOM-dependent test files opt in with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['lib/**/*.test.{ts,tsx}'],
  },
})
