# Contributing

Bug reports, ideas and pull requests are all welcome. Everyone taking part follows the
[code of conduct](CODE_OF_CONDUCT.md).

## Report a bug or suggest a feature

[Open an issue](https://github.com/bronz3beard/react-marketing-tools/issues/new/choose) and pick the bug report or
feature request template. For a security vulnerability, don't open an issue: follow the
[security policy](SECURITY.md) instead.

## Make a change

1. For anything bigger than a small fix, open an issue first, so the approach is agreed before you write the code.
2. Fork the repository, branch from `main`, and install with `npm ci` (Node 22.12 or later).
3. Make the change, with tests (see below). If a user would notice it, update the README or the page in `docs/` that
   describes it.
4. Run the checks. Each one says what's wrong when it fails, and `npm run format` fixes formatting.

   ```sh
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   npm run build
   npm run check:api-summary   # a new export or option must be listed in the docs
   ```

5. Open a pull request against `main` that says what changed and why. CI runs these checks and the package, size and
   link checks on Node 22, 24 and 26.

The package has no runtime dependencies. Please raise one in an issue before adding it.

## Tests

New behaviour and bug fixes come with tests, and a bug fix includes a test that fails without it. Tests use
[Vitest](https://vitest.dev) and sit next to the code they cover (`lib/**/*.test.ts`). Test what someone using the
library would see, such as the event a destination receives or the response the server handler returns, rather than
internal details.
