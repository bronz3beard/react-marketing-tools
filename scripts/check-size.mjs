// Fails when a published bundle grows past its gzip budget. Budgets are the measured size + ~5%.
// Raise one only deliberately, with the reason in the commit message — never to silence an unexpected jump.
// 0.4.x is dominated by device-detector-js; the 1.0 line removes it and sets much smaller budgets.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const budgetsKb = {
  'dist/react-marketing-tools.es.js': 199,
  'dist/react-marketing-tools.umd.cjs': 191,
}

for (const [file, budgetKb] of Object.entries(budgetsKb)) {
  const sizeKb = gzipSync(readFileSync(file)).length / 1024
  const withinBudget = sizeKb <= budgetKb

  if (!withinBudget) process.exitCode = 1
  console.log(
    `${withinBudget ? 'ok  ' : 'FAIL'} ${file}: ${sizeKb.toFixed(1)} kB gzip (budget ${budgetKb} kB)`,
  )
}
