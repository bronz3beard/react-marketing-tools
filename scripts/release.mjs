// Tags the version in package.json on main and pushes only that tag. The Release workflow takes it from there: it
// checks the tag again, runs CI, stages the package on npm and creates the GitHub Release.
//
//   npm run release              # tag and push
//   npm run release -- --dry-run # run every check and print the tag message, change nothing
//
// Each check says how to fix what it found. Signing: set `git config tag.gpgSign true` and the tag is signed.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { ChangelogError, changelogSection } from './changelog-section.mjs'

// The same pattern the Release workflow checks the tag against.
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

class ReleaseError extends Error {}

const run = (command, args) =>
  execFileSync(command, args, { encoding: 'utf8' }).trim()

const tryRun = (command, args) => {
  try {
    return run(command, args)
  } catch {
    return undefined
  }
}

const check = (ok, message) => {
  if (!ok) throw new ReleaseError(message)
}

const main = ({ dryRun }) => {
  run('git', ['fetch', '--quiet', '--tags', 'origin', 'main'])

  const branch = run('git', ['branch', '--show-current'])
  check(branch === 'main', `on "${branch}": run "git switch main" first`)
  check(
    run('git', ['status', '--porcelain']) === '',
    'uncommitted changes: commit or stash them first',
  )
  const head = run('git', ['rev-parse', 'HEAD'])
  check(
    head === run('git', ['rev-parse', 'origin/main']),
    'main is not the same as origin/main: run "git pull --ff-only" (and push nothing to main directly)',
  )

  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  const tag = `v${version}`
  check(
    SEMVER.test(version),
    `package.json version "${version}" is not x.y.z or x.y.z-pre`,
  )
  check(
    tryRun('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]) ===
      undefined,
    `${tag} already exists: bump the version with "npm version <next> --no-git-tag-version" in a pull request`,
  )

  changelogSection({
    changelog: readFileSync('docs/CHANGELOG.md', 'utf8'),
    version,
  })

  const ci = tryRun('gh', [
    'run',
    'list',
    '--commit',
    head,
    '--workflow',
    'CI',
    '--limit',
    '1',
    '--json',
    'status,conclusion',
    '--jq',
    'if length == 0 then "not run" else .[0] | "\\(.status) \\(.conclusion)" end',
  ])
  check(
    ci !== undefined,
    'could not ask GitHub for CI results: install the GitHub CLI and run "gh auth login"',
  )
  check(
    ci === 'completed success',
    `CI for ${head.slice(0, 7)} is "${ci}", not "completed success": wait for it or fix it first`,
  )

  const previous = tryRun('git', ['describe', '--tags', '--abbrev=0', head])
  const commits = run('git', [
    'log',
    '--oneline',
    '--no-decorate',
    previous ? `${previous}..HEAD` : 'HEAD',
  ])
  const message = `${tag}\n\nChanges since ${previous ?? 'the first commit'}:\n${commits}`

  console.log(`${message}\n`)
  if (dryRun) {
    console.log(`ok   dry run: ${tag} would be created on ${head.slice(0, 7)}`)
    return
  }

  run('git', ['tag', '--annotate', tag, '--message', message])
  run('git', ['push', 'origin', `refs/tags/${tag}`])
  console.log(
    `ok   pushed ${tag}. Watch it with "gh run watch", then approve with "npm stage list react-marketing-tools" and "npm stage approve <id>"`,
  )
}

try {
  main({ dryRun: process.argv.includes('--dry-run') })
} catch (error) {
  const known = error instanceof ReleaseError || error instanceof ChangelogError
  console.error(`FAIL ${known ? error.message : error}`)
  process.exitCode = 1
}
