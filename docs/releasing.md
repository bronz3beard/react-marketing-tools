# Releasing

A release starts with a version tag. `npm run release` tags the version in `package.json` on `main` and pushes only
that tag; the [Release workflow](../.github/workflows/release.yml) does the rest:

1. checks the tag is `v` plus the `package.json` version, points at a commit on `main`, and has a section in
   [the changelog](./CHANGELOG.md)
2. runs every CI check
3. stages the package with npm trusted publishing: no npm token is stored anywhere, and npm adds a provenance
   attestation that links the package to the commit that built it
4. creates the GitHub Release, with the version's changelog section as its notes and a CycloneDX software bill of
   materials (SBOM) attached

A staged version isn't installable until you approve it with 2FA, so even a compromised build can't publish on its own.
Version tags can't be moved or deleted, and a published GitHub Release can't be changed.

## Publishing a version

1. On a branch, set the new version without creating a git tag:

   ```sh
   npm version 1.0.1 --no-git-tag-version
   ```

   A version with a `-` (`1.1.0-rc.0`, `2.0.0-beta.1`) is a pre-release: it goes to the `next` dist-tag and its GitHub
   Release is marked as a pre-release. Any other version goes to `latest`.

2. Add a `## [1.0.1] - DD-MM-YYYY` section to [the changelog](./CHANGELOG.md), listing every fixed vulnerability under
   **Security**, and check the README is current: npm shows the README of the `latest` version.

   CI fails if a public option, method or export is missing from [the API summary](./api-summary.md) or from the
   allowed list in [the AI setup prompt](./agent-setup.md), so those two pages can't fall behind the code. What CI
   can't judge is whether the prompt still asks the *right questions*: if this release adds, removes or renames a
   public option, re-run the prompt validation and update its "last validated" line.

3. Open a pull request, wait for CI, and merge it. `main` only accepts changes through pull requests.

4. Tag and push:

   ```sh
   git switch main && git pull --ff-only
   npm run release -- --dry-run   # every check, and the tag message it would write
   npm run release
   ```

   It stops, saying what to fix, unless you're on an up-to-date `main` with no uncommitted changes, the version isn't
   tagged yet, the changelog has a section for it, and CI passed on that commit. The tag message lists the commits
   since the previous tag. To sign tags, run `git config tag.gpgSign true` once.

5. Watch the workflow with `gh run watch`. When it has finished, approve the staged version from a machine where
   you're logged in to npm:

   ```sh
   npx -y npm@11 stage list react-marketing-tools   # the "id:" line is the stage ID
   npx -y npm@11 stage approve <stage-id>           # asks for your 2FA code
   ```

   Or approve it on npmjs.com. `npx -y npm@11 stage reject <stage-id>` discards it instead. `npm stage` needs npm 11.19
   or later; `npx -y npm@11` runs it for that one command without changing your installed npm (npm 10, bundled with
   Node.js 22, says `Unknown command: "stage"`). Avoid `npm@latest`: npm 12 doesn't support Node.js 22 before 22.22.

Check the result:

```sh
npm view react-marketing-tools dist-tags
gh release view v1.0.1
```

## When the workflow fails

- **Before staging** (the tag check, CI or `npm stage publish`): nothing reached npm and there is no GitHub Release.
  Fix the problem on a branch. If the fix changes the code, release it as the next version. The tag stays, because
  version tags can't be deleted. To reuse the version instead, a repository admin can switch off the `release tags`
  ruleset, delete the tag (`git push origin :refs/tags/v1.0.1` and `git tag -d v1.0.1`), and switch the ruleset back
  on. Do that only before a GitHub Release exists.
- **After staging, before the GitHub Release**: reject the staged version (`npm stage reject <stage-id>`) and treat it
  as above, or approve it and re-run the failed `release` job from the Actions tab.

## One-time setup

On npmjs.com, open the package's **Settings → Trusted Publisher**, choose **GitHub Actions**, and enter:

| Field | Value |
| --- | --- |
| Organization or user | `bronz3beard` |
| Repository | `react-marketing-tools` |
| Workflow filename | `release.yml` |
| Environment name | (empty) |
| Allow npm publish | unticked: the workflow only stages |

Until this is set up, the workflow's stage step fails and nothing is staged. Under **Publishing access**, "Require
two-factor authentication and disallow bypass 2fa tokens" works with this setup.

On GitHub, the repository's rulesets protect `main` (pull requests only, CI and CodeQL must pass) and `v*` tags (no
updates or deletions), and **Settings → General → Releases → release immutability** is on.

## Publishing by hand

`npm publish` from a logged-in machine still works, with your 2FA code. `publishConfig.tag` in `package.json` sends it
to `next`, so a manual publish can't replace `latest` by accident; pass `--tag latest` to do that on purpose. A manual
publish has no provenance, no GitHub Release and no SBOM, so use it only when the workflow can't run.
