import { describe, expect, it } from 'vitest'
import { changelogSection } from './changelog-section.mjs'

const CHANGELOG = `# Changelog
Intro text.

## [1.0.1] - 01-10-2026
__Fixed__
- a fix

## [1.0.0] - 20-09-2026
__Added__
- everything

## [1.0.0-beta.4] - 20-09-2026
__Added__
- beta things
`

describe('reading one version from the changelog', () => {
  it('returns the section body up to the next version heading', () => {
    expect(changelogSection({ changelog: CHANGELOG, version: '1.0.1' })).toBe(
      '__Fixed__\n- a fix',
    )
  })

  it('returns the last section when it runs to the end of the file', () => {
    expect(
      changelogSection({ changelog: CHANGELOG, version: '1.0.0-beta.4' }),
    ).toBe('__Added__\n- beta things')
  })

  it("doesn't take a prerelease heading for its final version", () => {
    expect(changelogSection({ changelog: CHANGELOG, version: '1.0.0' })).toBe(
      '__Added__\n- everything',
    )
  })

  it('treats the dots in a version literally', () => {
    expect(() =>
      changelogSection({ changelog: CHANGELOG, version: '1x0x1' }),
    ).toThrow('no "## [1x0x1]" section')
  })

  it('fails when the version has no section', () => {
    expect(() =>
      changelogSection({ changelog: CHANGELOG, version: '2.0.0' }),
    ).toThrow('no "## [2.0.0]" section in docs/CHANGELOG.md')
  })

  it('fails when the version has two sections', () => {
    const doubled = `${CHANGELOG}\n## [1.0.1] - 02-10-2026\n- again\n`
    expect(() =>
      changelogSection({ changelog: doubled, version: '1.0.1' }),
    ).toThrow('2 "## [1.0.1]" sections')
  })

  it('fails when the section has no notes', () => {
    expect(() =>
      changelogSection({
        changelog:
          '## [1.0.2] - 03-10-2026\n\n## [1.0.1] - 01-10-2026\n- a fix',
        version: '1.0.2',
      }),
    ).toThrow('is empty')
  })
})
