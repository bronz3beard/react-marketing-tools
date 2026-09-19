# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- __Added__ for new features.
- __Changed__ for changes in existing functionality.
- __Deprecated__ for soon-to-be removed features.
- __Removed__ for now removed features.
- __Fixed__ for any bug fixes.
- __Security__ in case of vulnerabilities.

## [1.0.0-alpha.3] - 19-09-2026
__Added__
- Google Analytics 4 destination (`ga4: { measurementId }`) through gtag.js: events, `user_id` from `identify()` (cleared
  by `reset()`), and automatic or manual (`pageViews: 'manual'`) page views. It reuses a page's existing `gtag`.
- server-side tagging: `ga4.serverContainerUrl` routes GA4 hits to your server container and adds `event_id` to events
  for server-side deduplication; `gtm.scriptUrl` loads the Tag Manager container from your own domain
- consent: `analytics.consent.update({ analytics, ads, adUserData, adPersonalization })` and `analytics.consent.get()`.
  Updates are applied in order with events, and do nothing on the server.
- Google Consent Mode v2 for GA4 and Tag Manager: the default is set before any tag loads (with `wait_for_update` when a
  signal starts denied; configurable through `waitForUpdate`), and every change sends an update
- Global Privacy Control: advertising consent starts denied when the browser sends it (`respectGpc`, default `true`)
- `invalid_consent` error code
- docs: Google Analytics 4, server-side tagging, consent
__Changed__
- **Breaking (custom destinations):** `Destination.start()` now receives `{ consent }`, and destinations can implement
  `consent(state)`
__Removed__
- the `device-detector-js` dependency; the package now has no runtime dependencies
- the unused 0.4 source and its type declarations (no longer exported since 1.0.0-alpha.2)

## [1.0.0-alpha.2] - 19-09-2026
__Added__
- React bindings: `<AnalyticsProvider analytics={analytics}>` (starts analytics after mount; safe under StrictMode)
  and `useAnalytics()`. Components can track on mount; those events are queued until the provider starts.
- the package entry is marked `'use client'` for React Server Components (Next.js App Router);
  `react-marketing-tools/core` stays unmarked for server and non-React code
- docs: React (provider, hook, Next.js App Router, page views in single-page apps)
__Changed__
- **Breaking:** `react-marketing-tools` now exports the 1.0 API (everything in `react-marketing-tools/core` plus the
  React bindings) instead of the 0.4 API (`buildConfig`, `trackAnalyticsEvent`, `ReactMarketingProvider`,
  `useMarketingState`, `useMarketingApi`)
- **Breaking:** peer dependency is now `react >=18`
- the published JavaScript is 2.55 kB gzipped (0.4.x was 189 kB)

## [1.0.0-alpha.1] - 19-09-2026
__Added__
- `page()`, `identify(userId, traits)` and `reset()`, queued in call order with `track()`. GTM receives `page_view`,
  `identify` (no traits) and `reset` (clears `user_id` from its data model).
- GA4 naming rules for event and param names (pattern, 40 characters, reserved `google_`/`ga_`/`firebase_` prefixes), plus
  GA4 param count and value length limits
- personal-data redaction: values of `email`/`phone`/`first_name`/`last_name`/`address`/`password` params, and email
  addresses inside any string (including URL-encoded ones), become `[redacted]` before leaving the page
- `onError` (default `console.error`) and `debug`; problems arrive as an `AnalyticsError` with a `code`. A failing
  destination never breaks the app or the other destinations.
- docs: tracking events

## [1.0.0-alpha.0] - 19-09-2026
Published on the `next` dist-tag; `latest` stays on 0.4.x. The package root (`react-marketing-tools`) still exports
the 0.4 API in this alpha.

__Added__
- `react-marketing-tools/core`: `createAnalytics({ consent, gtm, destinations, nonce })` with `start()` and
  `track(name, params)`. One call reaches every destination with a shared UUID `event_id`. Events tracked before
  `start()` are queued, and it's safe to use during server rendering.
- Google Tag Manager destination: loads the container like the official snippet (once, CSP-nonce aware, and not at all if
  the page already has the snippet) and pushes `{ ...params, event, event_id }`
- custom destinations through the `Destination` type
- docs: getting started, configuration, Google Tag Manager
__Changed__
- **Breaking:** the package is ESM-only and requires Node.js 22.12 or later for server rendering and tooling. Files are
  now `dist/index.js` and `dist/core.js`.
__Removed__
- **Breaking:** the UMD bundle, the CommonJS entry and the `.d.cts` declarations (Node 22.12+ can `require()` the ESM
  build)

## [0.4.4] - 19-09-2026
__Fixed__
- `trackAnalyticsEvent` rejected every event unless server location lookup was configured, so nothing reached the
  dataLayer with the documented setup. Events are now delivered with the default config; enabling
  `withServerLocationInfo` without an `IP_INFO_TOKEN` still throws.
- tracking threw a `TypeError` when `window.dataLayer` did not exist yet; it is now created, as the GTM snippet does
- `require('react-marketing-tools')` returned an empty module in Node (the UMD build was loaded as ESM); CommonJS
  consumers now load `dist/react-marketing-tools.umd.cjs`
- the published type declarations were incomplete and failed to resolve; every declaration file now ships, with
  CommonJS twins (`.d.cts`) for `require` consumers
- the bundle embedded React's JSX runtime from the React version it was built with; it no longer does, and works
  with React 17, 18 and 19
- `npm ci` failed with a peer dependency conflict (`@vitejs/plugin-react` vs `vite`)
- lint could not run (legacy CommonJS `.eslintrc.js` in an ES module package, missing parser)
__Added__
- `react >=17` peer dependency (React was previously undeclared)
- `sideEffects: false` so bundlers can tree-shake
- Vitest test suite, GitHub Actions CI (Node 22, 24, 26), package checks (publint, arethetypeswrong) and a bundle
  size gate
- `lint`, `format` and `format:check` scripts, enforced in CI
- Dependabot for npm and GitHub Actions (weekly, grouped)
- `prepublishOnly` rebuilds and size-checks the package before every publish
__Changed__
- the UMD bundle is also published as `dist/react-marketing-tools.umd.cjs`; the `.umd.js` path is kept for CDN users
- `ReactMarketingProvider` declares its return type as `ReactElement`
- development toolchain: Vite 8, TypeScript 7 (with TypeScript 6 side-by-side for lint tooling), React 19,
  `@types/node` 22, ESLint 10 flat config with typescript-eslint and React Hooks rules, Prettier 3
- type declarations are emitted by `tsc`
- `check-types` script renamed to `typecheck`
__Removed__
- unused `prop-types` dependency
- `vite-plugin-dts`, `@vitejs/plugin-react`, ESLint 8, `eslint-plugin-react` and the duplicate `eslintConfig` block
  in `package.json`
- broken `dev`/`preview` scripts and `index.html` (they referenced a missing `src/main.tsx`)
__Security__
- all `npm audit` advisories resolved (the remaining 6 came from ESLint 8's dependency tree)

## [0.4.3] - 02-01-2024
__Fixed__
- IP_INFO_TOKEN
__Changed__
- types

## [0.3.6] - 07-01-2023
__Fixed__
- package exports
- types exports and paths
- package.json

## [0.3.2] - 07-01-2023
__Change__
- package exports

## [0.3.0] - 07-01-2023
__Change__
- type declaration file
- tsconfig file

## [0.2.9] - 07-01-2023
__Change__
- CHANGELOG order
- type declaration file
- tsconfig file

## [0.2.8] - 07-01-2023
__Change__
- README added new Codepen demo and a blog post link fora detailed implementing example

## [0.2.6] - 07-01-2023
__Change__
- README

## [0.2.0] - 06-01-2023
__Added__
- typescript
__Change__
- jsDocs

## [0.1.2] - 05-01-2023
__Added__
- boolean check for user object attribute on buildNewUserData function
__Changed__
- README

## [0.0.9] - 01-09-2022
__Changed__
- user object attribute check for buildNewUserData
- README
__Fixed__
- TOKENS assertion for GA4

## [0.0.4] - 20-08-2022
__Fixed__ 
- serverLocationData bug duplicate entries in payload
- variable name for dataLayerCheck
__Changed__
- README
__Added__
- appSessionCookieName and appName to useMarketingState Context 

## [0.0.1] - 19-08-2022
__Changed__
- README

## [0.0.1] - 13-08-2022
__Added__
- README
- CHANGELOG
- pull_request_template
- codebase untested
