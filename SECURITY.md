# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| 0.x     | No        |

Fixes are released as a new 1.x version on npm.

## Reporting a vulnerability

Report it privately through GitHub:
[Report a vulnerability](https://github.com/bronz3beard/react-marketing-tools/security/advisories/new). Please don't
open a public issue, pull request or discussion about it.

Include what you can of:

- the version and the import you use, e.g. `react-marketing-tools/server`
- the steps or a minimal example that reproduces it
- what an attacker could do with it

The report stays private until a fix is released. The advisory is then published, crediting you unless you'd rather
not be named.

## Scope

In scope: the code in this repository, which is the npm package and the
[playground](https://bronz3beard.github.io/react-marketing-tools/). That includes personal data reaching an analytics
platform despite redaction or denied consent.

Out of scope: vulnerabilities in Google Tag Manager, Google Analytics, the Meta Pixel or the Conversions API
themselves. Report those to Google or Meta.
