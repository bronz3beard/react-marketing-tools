// 0.4.3 shipped its UMD bundle at dist/react-marketing-tools.umd.js and CDN users load that path directly
// (jsDelivr served it in the last year). Node needs the .cjs name in a "type": "module" package, so the patch line
// ships both files with identical content. 1.0 drops the UMD build and this step (batch B4).
import { copyFileSync } from 'node:fs'

copyFileSync(
  'dist/react-marketing-tools.umd.cjs',
  'dist/react-marketing-tools.umd.js',
)
