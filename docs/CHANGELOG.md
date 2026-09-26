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

## [Unreleased]
__Added__
- every GitHub Release has a CycloneDX software bill of materials (SBOM) attached, and its notes are the version's
  section of this changelog
- `SUPPORT.md` (what is supported and where to ask) and a code of conduct
__Changed__
- `SECURITY.md` commits to a first response to vulnerability reports within 14 days

## [1.0.0] - 20-09-2026
First stable release. `npm install react-marketing-tools` now gives you 1.0 instead of 0.4.x.

The code is unchanged from `1.0.0-beta.4`; every pre-release entry below is part of this release. What follows is the
short version for anyone arriving from 0.4.

__Added__
- one `track()` call reaches Google Tag Manager, Google Analytics 4 and the Meta Pixel, with a shared `event_id` so
  the Pixel and the Conversions API deduplicate by construction
- Google Consent Mode v2 and Global Privacy Control, with consent denied until you say otherwise
- campaign attribution: UTM params and ad click IDs, first and last touch, stored only with consent
- journeys, click autocapture from HTML attributes, a stable visitor ID, and Core Web Vitals
- `react-marketing-tools/server`: GA4 Measurement Protocol, the Meta Conversions API, and a relay that re-sends the
  browser's events from your server so they arrive when the Pixel is blocked
- personal-data redaction before anything leaves the page, and GA4's naming and size rules enforced on the way out
- React bindings, a [playground](https://bronz3beard.github.io/react-marketing-tools/), and 26 documentation pages
  including a Next.js App Router guide, an integration walkthrough for an app that already has analytics, an API
  summary, and a setup prompt for AI coding assistants
__Changed__
- **Breaking:** the package exports a new API. `buildConfig`, `trackAnalyticsEvent`, `ReactMarketingProvider`,
  `useMarketingState` and `useMarketingApi` are gone — see the [migration guide](./migration-v1.md)
- **Breaking:** ESM only, Node.js 22.12 or later for server rendering and tooling
- **Breaking:** the React peer dependency is now `>=18`
- no runtime dependencies at all (0.4 bundled `device-detector-js`), and the main entry is 7.13 kB gzipped where
  0.4.x was 189 kB
__Removed__
- **Breaking:** the UMD bundle, the CommonJS entry and the `.d.cts` declarations

## [1.0.0-beta.4] - 20-09-2026
__Added__
- AI assistant visits: `attribution: { aiSources }` labels a visit with `ai_source` when its referrer matches one of
  the hostnames **you** list (the library ships no list, because these change faster than releases). A visit from one
  is recorded even without campaign params, and lookalike domains don't match.
- AI crawlers: `matchAiAgent()` and `sendAiCrawlerEvent()` in `react-marketing-tools/server`, against **your** list of
  user agents. Every crawler event is stamped with `ai_agent` and `traffic_type`, which can't be overridden, and the
  call is refused unless `keepSeparate` says how the traffic is kept out of your visitor reports (a crawler-only GA4
  property, or a `traffic_type` value you exclude with a data filter).
- docs: measuring AI activity, and sending events to other tools (PostHog, Umami, Plausible, your own endpoint, plus
  what Screaming Frog can and can't do)
- docs: an integration walkthrough for adding the library to an app that already exists, including how to prove events
  arrive in Tag Assistant, GA4 DebugView and Meta Test events, and how to retire the analytics library it replaces
- docs: an API summary — every entry point, option, method, error code and limit on one page
- docs: a setup prompt you can paste into any AI coding assistant, which interviews you and writes the wiring, the
  checklist of what to click in each service, and the checks that prove it works
- a CI check (`npm run check:api-summary`) fails when a public option, method or export is missing from the API
  summary or from the prompt's allowed list, so neither page can fall behind the code. It reads the TypeScript AST, and
  refuses to pass if it finds nothing to check.
__Changed__
- the Next.js guide calls out that `createTrackHandler()` checks its settings while Next.js builds, so a build without
  `META_CAPI_TOKEN` fails, and shows how to defer that to the first request
- package metadata: `homepage` now points at the playground, and the keywords cover the Conversions API, Measurement
  Protocol, Web Vitals, consent, privacy, Next.js and TypeScript

## [1.0.0-beta.3] - 19-09-2026
__Added__
- `react-marketing-tools/web-vitals`: `trackWebVitals(analytics)` reports LCP, INP and CLS as events with the params the
  `web-vitals` library recommends for GA4 (`value`, `metric_id`, `metric_value`, `metric_delta`, `metric_rating`, and
  `page_location` for metrics reported after a client-side navigation). `web-vitals` 6 is an optional peer dependency,
  loaded when first called; a second call for the same instance does nothing.
- `track(name, params, { meta: false })` keeps an event away from the Meta Pixel and the relay
__Changed__
- releases are staged on npm and published only once a maintainer approves them with 2FA (`npm stage approve`)
- README: a table of contents, a titled section per example, plainer wording, and a "what you need before you start"
  table (the accounts and IDs the library expects you to have already). Every example was compiled and run as written.
- the playground and getting started explain what they assume you already have: a Tag Manager container with its own
  tags and triggers, a GA4 web data stream, a Meta Pixel dataset, and server-side secrets
- docs: a Next.js App Router guide (layout, providers, page views, client components, server actions, webhooks and the
  relay endpoint), checked against Next.js 16 with a type-check and a build; and error tracking, which sends your app's
  errors to GA4 as `exception` events

## [1.0.0-beta.2] - 19-09-2026
__Added__
- journeys: `analytics.journey(name)` returns `step()`, `complete()` and `abandon()`, sending `journey_start` (with the
  first call), `journey_step`, `journey_complete` and `journey_abandon` with a shared `journey_id` and `journey_name`,
  `step_name`, `step_index` and `step_count`; calls after a journey ended are reported as the new `journey_ended` code
- click autocapture: `autocapture: { clicks: true }` tracks clicks on elements with `data-analytics-event`, with
  `data-analytics-param-*` attributes as params, through one capture-phase listener added by `start()`
- docs: journeys (with a GA4 funnel how-to), click autocapture, journeys in React
- [playground](https://bronz3beard.github.io/react-marketing-tools/) on GitHub Pages: track events, change consent,
  walk a journey, open campaign links and try your own IDs, and see what each vendor receives
- docs: an index of every doc, a migration guide from 0.4, debugging, and the release process
- releases are published from GitHub Releases with npm trusted publishing, which adds provenance
__Changed__
- docs: the visitor ID page describes how the ID follows consent; compliance decisions are left to the implementer
- README: playground link and a table of what each destination receives

## [1.0.0-beta.1] - 19-09-2026
__Added__
- visitor ID: `analytics.getVisitorId()` resolves a stable ID for a consenting visitor, once `start()` has run. It's never
  sent to Google Analytics or the dataLayer.
  - `visitorId: 'random'` (default): a random UUID in `localStorage` (`rmt:vid`), made on first use, only with
    `analytics` consent, and erased when that consent is withdrawn
  - `visitorId: { fingerprint }`: your function's fingerprint, only with `analytics` and `ads` consent, computed once per
    page and never stored; a failure is reported as the new `visitor_id_failed` error code
  - `visitorId: false` turns it off
- `react-marketing-tools/fingerprintjs`: `fingerprintjs()` adapter for FingerprintJS v5 (MIT), an optional peer
  dependency loaded only when the ID is first needed, with its statistics request turned off
- the relay sends the visitor ID as Meta's `external_id` for visitors who aren't identified
- docs: visitor ID
__Changed__
- the relay's `destination_failed` errors are listed in the errors table

## [1.0.0-beta.0] - 19-09-2026
__Added__
- relay to the Meta Conversions API, deduplicated with the Pixel:
  - `server: { endpoint }` posts every Pixel event (same Meta event name, params and event ID) to your endpoint with
    `navigator.sendBeacon` (keepalive `fetch` fallback), with the identified user and `fbc`/`fbp`, only with `adUserData`
    consent. Page views are relayed only when the Pixel doesn't send its own.
  - `createTrackHandler({ allowedOrigins, meta })` from `react-marketing-tools/server`: a Web-standard
    `(Request) => Response` endpoint that checks the origin, body size (16 KB), body and consent, adds the visitor's IP
    address and user agent, and forwards the event with `sendConversionsApiEvent()`. Nothing is forwarded to GA4.
- docs: relaying the Pixel's events (Next.js and Express examples)
__Changed__
- 1.0 is feature-complete for its core toolbox and moves from alpha to beta

## [1.0.0-alpha.6] - 19-09-2026
__Added__
- `react-marketing-tools/server` entry for Node.js 22.12+ and edge runtimes, with no dependencies:
  - `sendMeasurementProtocolEvent()`: GA4 events from your server, with `session_id` and `engagement_time_msec` so they
    join the visitor's session, advertising consent, the EU endpoint (`region: 'eu'`) and a `validate` mode that returns
    GA4's validation messages
  - `readGa4Cookies()`: the GA4 client and session IDs from the `_ga` and `_ga_<stream>` cookies (`GS1` and `GS2`)
  - `sendConversionsApiEvent()`: Meta Conversions API events (Graph API `v26.0`, configurable), with customer information
    normalised and SHA-256 hashed as Meta requires, browser signals (`fbc`, `fbp`, IP address, user agent) sent unhashed,
    and `testEventCode`
  - both check arguments before sending, redact personal data from event params, and resolve HTTP errors as
    `{ ok: false }` instead of throwing
- docs: GA4 Measurement Protocol, Meta Conversions API
__Changed__
- the size check budgets each entry (with the chunks it imports) instead of the total of every file

## [1.0.0-alpha.5] - 19-09-2026
__Added__
- attribution: UTM params and ad click IDs (`gclid`, `gbraid`, `wbraid`, `dclid`, `fbclid`, `msclkid`, `ttclid`,
  `li_fat_id`, `twclid`) captured from landing URLs and from `page()` navigations; first and last touch through
  `analytics.getAttribution()`
- attribution storage only with analytics consent (first touch in `localStorage` for 90 days, configurable with
  `attribution: { ttlDays }`; last touch in `sessionStorage`), restored when consent is granted and erased when it's
  withdrawn. Captured values are email-redacted and capped, and landing and referrer URLs keep only origin and path.
- Google Tag Manager pushes include `attribution` (the last touch)
- `fbc` and `fbp` (Meta click and browser IDs) through `getAttribution()`, only with `adUserData` consent
- docs: attribution
__Changed__
- README rewritten: install and usage only, with links to the docs. The blog post and CodePen links were removed; a
  hosted demo will replace them.
- package description and keywords describe the 1.0 toolbox

## [1.0.0-alpha.4] - 19-09-2026
__Added__
- Meta Pixel destination (`metaPixel: { pixelId }`), loaded with Meta's official base code:
  - GA4 recommended events become Meta standard events (`purchase` → `Purchase`, `sign_up` → `CompleteRegistration`,
    `generate_lead` → `Lead`, and more); other events are sent with `trackCustom`
  - every event carries the shared `eventID`, ready for deduplication with the Conversions API
  - ecommerce `items` become `content_ids`/`contents`/`num_items`, and `search_term` becomes `search_string`
  - consent follows `adUserData`: `revoke` is queued before `init` when denied, and updates send `grant`/`revoke`
  - advanced matching (`em`, `ph`, `fn`, `ln`, `external_id`) from the user identified before `start()`
  - automatic or manual (`pageViews: 'manual'`) page views
- `track(name, params, options)`: per-destination overrides, starting with `{ meta: { event, params } }`
- docs: Meta Pixel
__Changed__
- custom destinations' `start()` context also carries `identity` (the user identified before start)

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
