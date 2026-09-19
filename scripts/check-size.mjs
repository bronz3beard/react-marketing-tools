// Fails when a published bundle grows past its gzip budget. Budgets are the measured size + ~5%.
// Raise one only deliberately, with the reason in the commit message — never to silence an unexpected jump.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const budgetsKb = {
  // Still the 0.4 API, dominated by device-detector-js; replaced by the React bindings in batch B6.
  'dist/index.js': 199,
  'dist/core.js': 1.1,
}

for (const [file, budgetKb] of Object.entries(budgetsKb)) {
  const sizeKb = gzipSync(readFileSync(file)).length / 1024
  const withinBudget = sizeKb <= budgetKb

  if (!withinBudget) process.exitCode = 1
  console.log(
    `${withinBudget ? 'ok  ' : 'FAIL'} ${file}: ${sizeKb.toFixed(2)} kB gzip (budget ${budgetKb} kB)`,
  )
}
