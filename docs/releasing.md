# Releasing

Releases are published to npm by the [Release workflow](../.github/workflows/release.yml) when a GitHub Release is
published. It runs every CI check first, then publishes with npm trusted publishing, so no npm token is stored anywhere
and npm adds a provenance attestation that links the package to the commit that built it.

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
4. Publish the release. The workflow refuses to publish when the tag doesn't match `package.json`, or when a prerelease
   version isn't marked as a pre-release.

Check the result with `npm view react-marketing-tools dist-tags`.

## One-time setup

On npmjs.com, open the package's **Settings → Trusted Publisher**, choose **GitHub Actions**, and enter:

| Field | Value |
| --- | --- |
| Organization or user | `bronz3beard` |
| Repository | `react-marketing-tools` |
| Workflow filename | `release.yml` |
| Environment name | (empty) |

Until this is set up, the workflow's publish step fails and nothing is published.

## Publishing by hand

`npm publish` from a logged-in machine still works. `publishConfig.tag` in `package.json` sends it to `next`, so a
manual publish can't replace `latest` by accident; pass `--tag latest` to do that on purpose.
