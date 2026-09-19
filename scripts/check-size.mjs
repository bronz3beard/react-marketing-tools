// Fails when a package entry grows past its gzip budget. Each entry is measured with the chunks it imports, gzipped
// together, which is roughly what an app's bundler ships for that import. Budgets are the measured size + ~5%.
// Raise one only deliberately, with the reason in the commit message — never to silence an unexpected jump.
// History (total of every dist file until alpha.5, per entry since alpha.6):
//          1.0.0-alpha.2 — 2.55 kB (core, GTM, validation, React bindings; the 0.4 bundle was 189 kB).
//          B7a — 2.98 kB (+ GA4 via gtag.js, server-side GTM routing, shared Google tag plumbing).
//          1.0.0-alpha.3 — 3.49 kB (+ Consent Mode v2, consent API, Global Privacy Control).
//          1.0.0-alpha.4 — 4.62 kB (+ Meta Pixel destination, GA4→Meta event/param mapping, identity at start).
//          1.0.0-alpha.5 — 5.66 kB (+ UTM/click-ID attribution, consent-gated storage, cookie parsing, fbc/fbp).
//          1.0.0-alpha.6 — index 5.47, core 5.31, server 3.00 kB (+ `server` entry: Measurement Protocol, Conversions API).
//          1.0.0-beta.0 — index 5.93, core 5.76, server 4.08 kB (+ `server` relay destination; `createTrackHandler`).
//          1.0.0-beta.1 — index 6.50, core 6.33, fingerprintjs 0.17 kB (+ consent-gated visitor ID; FingerprintJS adapter,
//                         whose library stays external and lazily imported).
//          1.0.0-beta.2 — index 6.97, core 6.80 kB (+ journeys, declarative click autocapture).
//          1.0.0-beta.3 — webVitals 0.34 kB (+ Core Web Vitals entry; `web-vitals` stays external and lazily imported).
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGETS_KB = {
  index: 7.3,
  core: 7.15,
  server: 4.3,
  fingerprintjs: 0.2,
  webVitals: 0.4,
}

const RELATIVE_IMPORT = /(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g

const withImports = (file, seen = new Set()) => {
  if (seen.has(file)) return seen
  seen.add(file)
  for (const [, specifier] of readFileSync(file, 'utf8').matchAll(
    RELATIVE_IMPORT,
  )) {
    withImports(normalize(join(dirname(file), specifier)), seen)
  }
  return seen
}

for (const [entry, budgetKb] of Object.entries(BUDGETS_KB)) {
  const files = [...withImports(join('dist', `${entry}.js`))]
  const sizeKb =
    gzipSync(Buffer.concat(files.map(file => readFileSync(file)))).length / 1024
  const withinBudget = sizeKb <= budgetKb
  if (!withinBudget) process.exitCode = 1
  console.log(
    `${withinBudget ? 'ok  ' : 'FAIL'} ${entry}: ${sizeKb.toFixed(2)} kB gzip (budget ${budgetKb} kB) — ${files.join(', ')}`,
  )
}
