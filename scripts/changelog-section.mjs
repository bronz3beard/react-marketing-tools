// Prints the release notes for one version: the body of its `## [x.y.z] - date` section in docs/CHANGELOG.md.
//
// The release workflow uses it as the GitHub Release notes, and `npm run release` uses it to refuse tagging a version
// the changelog doesn't describe. Both fail rather than publish a release with no notes.
//
//   node scripts/changelog-section.mjs 1.0.1
import { readFileSync } from 'node:fs'

const CHANGELOG = 'docs/CHANGELOG.md'

export class ChangelogError extends Error {}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The text under `## [version]`, up to the next `## [` heading, trimmed. Throws when there isn't exactly one. */
export const changelogSection = ({ changelog, version }) => {
  const lines = changelog.split('\n')
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\]`)
  const starts = lines.flatMap((line, index) =>
    heading.test(line) ? [index] : [],
  )

  if (starts.length === 0) {
    throw new ChangelogError(
      `no "## [${version}]" section in ${CHANGELOG}: add one describing this release`,
    )
  }
  if (starts.length > 1) {
    throw new ChangelogError(
      `${starts.length} "## [${version}]" sections in ${CHANGELOG}: keep one`,
    )
  }

  const body = lines.slice(starts[0] + 1)
  const end = body.findIndex(line => line.startsWith('## ['))
  const section = (end === -1 ? body : body.slice(0, end)).join('\n').trim()
  if (section === '') {
    throw new ChangelogError(
      `the "## [${version}]" section in ${CHANGELOG} is empty`,
    )
  }
  return section
}

// Run only as a script, so the test can import changelogSection.
if (process.argv[1]?.endsWith('changelog-section.mjs')) {
  const version = process.argv[2]
  try {
    if (!version) {
      throw new ChangelogError(
        'usage: node scripts/changelog-section.mjs <version>',
      )
    }
    console.log(
      changelogSection({
        changelog: readFileSync(CHANGELOG, 'utf8'),
        version,
      }),
    )
  } catch (error) {
    console.error(
      `FAIL ${error instanceof ChangelogError ? error.message : error}`,
    )
    process.exitCode = 1
  }
}
