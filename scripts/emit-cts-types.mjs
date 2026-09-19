// Writes a CommonJS twin (.d.cts) next to every emitted .d.ts so `require` consumers get types that match the
// .umd.cjs bundle (the package is "type": "module", so plain .d.ts files are read as ESM). Relative `.js`
// specifiers are rewritten to `.cjs` so each twin resolves to its sibling twin.
// 0.4.x only: the 1.0 line is ESM-only and removes this step (batch B4).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const toCommonJs = declarations =>
  declarations.replace(/(from '\.{1,2}\/[^']*)\.js'/g, "$1.cjs'")

for (const entry of readdirSync('dist', { recursive: true })) {
  if (!entry.endsWith('.d.ts')) continue

  const file = join('dist', entry)
  writeFileSync(
    file.replace(/\.d\.ts$/, '.d.cts'),
    toCommonJs(readFileSync(file, 'utf8')),
  )
}
