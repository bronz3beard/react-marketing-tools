/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig, esmExternalRequirePlugin } from 'vite'

// https://vite.dev/config/
// Type declarations are emitted separately by `tsc -p tsconfig.build.json` (see the build script).
export default defineConfig({
  base: '/react-marketing-tools/',
  build: {
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    lib: {
      entry: resolve(import.meta.dirname, 'lib/index.tsx'),
      name: 'React Marketing Tools',
      fileName: format => `react-marketing-tools.${format}.js`,
    },
    rollupOptions: {
      output: {
        globals: {
          react: 'React',
        },
      },
    },
  },
  plugins: [
    // Rolldown keeps `require('react')` inside bundled CommonJS (react/jsx-runtime) as-is, which throws in ESM output.
    // This plugin owns the externals and rewrites those requires to imports; it must not also be listed in `external`.
    esmExternalRequirePlugin({ external: ['react', 'react-dom'] }),
  ],
  test: {
    // Default to Node; DOM-dependent test files opt in with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['lib/**/*.test.{ts,tsx}'],
  },
})
