// Fails when the published JavaScript grows past its gzip budget. The budget covers every file in dist/ (entries plus
// shared chunks), which is what an app using the package downloads. It is the measured size + ~5%.
// Raise it only deliberately, with the reason in the commit message — never to silence an unexpected jump.
// History: 1.0.0-alpha.2 — 2.55 kB (core, GTM, validation, React bindings; the 0.4 bundle was 189 kB).
//          B7a — 2.98 kB (+ GA4 via gtag.js, server-side GTM routing, shared Google tag plumbing).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 3.2

const files = readdirSync('dist', { recursive: true })
  .filter(file => file.endsWith('.js'))
  .sort()

let totalKb = 0
for (const file of files) {
  const sizeKb = gzipSync(readFileSync(join('dist', file))).length / 1024
  totalKb += sizeKb
  console.log(`     dist/${file}: ${sizeKb.toFixed(2)} kB gzip`)
}

const withinBudget = totalKb <= BUDGET_KB
if (!withinBudget) process.exitCode = 1
console.log(
  `${withinBudget ? 'ok  ' : 'FAIL'} total: ${totalKb.toFixed(2)} kB gzip (budget ${BUDGET_KB} kB)`,
)
