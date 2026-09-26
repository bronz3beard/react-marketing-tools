// Fails when a link in the README, the root community files or docs points to a file or heading that doesn't exist.
// Covers relative links and links to this repository's files on GitHub (the README uses those, because npm shows it
// outside the repo).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

const REPO_FILE =
  /^https:\/\/github\.com\/bronz3beard\/react-marketing-tools\/blob\/main\/([^#]+)(?:#(.*))?$/
const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g

// GitHub's heading anchors: lowercase, punctuation removed, spaces turned into dashes.
const toAnchor = heading =>
  heading
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')

const anchorsIn = file =>
  new Set(
    readFileSync(file, 'utf8')
      .split('\n')
      .filter(line => /^#{1,6} /.test(line))
      .map(line => toAnchor(line.replace(/^#+ /, ''))),
  )

const files = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  ...readdirSync('docs')
    .filter(name => name.endsWith('.md'))
    .map(name => join('docs', name)),
]

let checked = 0
const broken = []
for (const file of files) {
  for (const [, href] of readFileSync(file, 'utf8').matchAll(MARKDOWN_LINK)) {
    const repoFile = REPO_FILE.exec(href)
    let target
    let anchor
    if (repoFile) {
      ;[, target, anchor] = repoFile
    } else if (/^[a-z][a-z+.-]*:/i.test(href)) {
      continue // another site, or mailto:
    } else {
      const [path, fragment] = href.split('#')
      target = path ? normalize(join(dirname(file), path)) : file
      anchor = fragment
    }

    checked += 1
    if (!existsSync(target)) {
      broken.push(`${file}: ${href} (no such file)`)
    } else if (
      anchor &&
      target.endsWith('.md') &&
      !anchorsIn(target).has(anchor)
    ) {
      broken.push(`${file}: ${href} (no such heading)`)
    }
  }
}

for (const problem of broken) console.log(`FAIL ${problem}`)
if (broken.length > 0) process.exitCode = 1
console.log(
  `${broken.length === 0 ? 'ok  ' : 'FAIL'} ${checked} links checked, ${broken.length} broken`,
)
