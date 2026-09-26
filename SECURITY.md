# Security policy

## Supported versions

| Version                     | Supported |
| --------------------------- | --------- |
| Latest 1.x release on npm   | Yes       |
| Older 1.x releases          | No        |
| 0.x                         | No        |

Fixes are released as a new 1.x version on npm, so upgrade to the latest release to get them. See
[SUPPORT.md](SUPPORT.md#what-is-supported).

## Reporting a vulnerability

Report it privately through GitHub:
[Report a vulnerability](https://github.com/bronz3beard/react-marketing-tools/security/advisories/new). Please don't
open a public issue, pull request or discussion about it.

Include what you can of:

- the version and the import you use, e.g. `react-marketing-tools/server`
- the steps or a minimal example that reproduces it
- what an attacker could do with it

You'll get a first response within 14 days. The report stays private until a fix is released. The advisory is then
published, crediting you unless you'd rather not be named.

Every fixed vulnerability is listed under **Security** in [the changelog](docs/CHANGELOG.md) and in the notes of the
GitHub Release that fixes it.

## Scope

In scope: the code in this repository, which is the npm package and the
[playground](https://bronz3beard.github.io/react-marketing-tools/). That includes personal data reaching an analytics
platform despite redaction or denied consent.

Out of scope: vulnerabilities in Google Tag Manager, Google Analytics, the Meta Pixel or the Conversions API
themselves. Report those to Google or Meta.
