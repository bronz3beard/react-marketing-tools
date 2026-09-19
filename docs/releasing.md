# Releasing

Releases go to npm through the [Release workflow](../.github/workflows/release.yml) when a GitHub Release is published.
It runs every CI check first, then stages the package with npm trusted publishing: no npm token is stored anywhere, and
npm adds a provenance attestation that links the package to the commit that built it. A staged version isn't
installable until you approve it with 2FA, so even a compromised build can't publish on its own.

## Publishing a version

1. Set the new version, without creating a git tag:

   ```sh
   npm version 1.0.0-beta.3 --no-git-tag-version
   ```

2. Add the version to [the changelog](./CHANGELOG.md), check the README is current, then commit and push to `main` and
   wait for CI.
3. On GitHub, open **Releases → Draft a new release**:
   - **Tag**: `v` plus the version, for example `v1.0.0-beta.3`, created on publish from `main`.
   - **Pre-release**: tick it for a version with a `-` (alpha, beta, rc). It then goes to the `next` dist-tag. Leave it
     unticked for a full release, which goes to `latest`.
4. Publish the release. The workflow stops before staging when the tag doesn't match `package.json`, or when a
   prerelease version isn't marked as a pre-release.
5. When the workflow has finished, approve the staged version from a machine where you're logged in to npm:

   ```sh
   npm stage list react-marketing-tools   # shows the stage ID
   npm stage approve <stage-id>           # asks for your 2FA code
   ```

   Or approve it on npmjs.com. `npm stage reject <stage-id>` discards it instead. The `npm stage` commands need npm
   11.19 or later (Node.js 26 bundles it; otherwise `npm install -g npm@latest`).

Check the result with `npm view react-marketing-tools dist-tags`.

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

## Publishing by hand

`npm publish` from a logged-in machine still works, with your 2FA code. `publishConfig.tag` in `package.json` sends it
to `next`, so a manual publish can't replace `latest` by accident; pass `--tag latest` to do that on purpose.
