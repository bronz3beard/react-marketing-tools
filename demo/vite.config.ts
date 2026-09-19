import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// The playground imports the library by its package name, resolved to the source, so it always shows the current code.
// `base` matches the GitHub Pages URL: https://bronz3beard.github.io/react-marketing-tools/
export default defineConfig({
  root: import.meta.dirname,
  base: '/react-marketing-tools/',
  resolve: {
    alias: [
      {
        find: /^react-marketing-tools$/,
        replacement: resolve(import.meta.dirname, '../lib/index.ts'),
      },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
