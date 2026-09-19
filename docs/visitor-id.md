# Visitor ID

A stable ID for a visitor who consented, to join their visits in your own systems or to match them in Meta's
[Conversions API](./meta-conversions-api.md). It's never sent to Google Analytics 4, which has its own client ID.

```ts
const visitorId = await analytics.getVisitorId()
```

`getVisitorId()` resolves once `analytics.start()` has run, so a component can ask before the provider starts. It
resolves `undefined` without the consent the ID needs, with `visitorId: false`, and on the server.

## Random ID (default)

With `visitorId: 'random'`, the default, the ID is a random UUID made the first time it's needed and kept in the
browser's `localStorage` (`rmt:vid`), only with `analytics` consent.

- It stays the same on every visit from that browser, until the visitor clears their site data or withdraws consent.
- Withdrawing analytics consent (`consent.update({ analytics: 'denied' })`) erases it. If consent is granted again, a new
  one is made.
- A page that starts with `consent: 'denied'` and then gets the visitor's earlier consent from your banner keeps the
  stored ID.
- If the browser blocks storage, the ID lasts for the page.

## Fingerprint

A fingerprint recognises a browser from its characteristics (screen, fonts, graphics and more) rather than from
storage, so it survives cleared site data.

```sh
npm install @fingerprintjs/fingerprintjs@^5
```

```ts
import { createAnalytics } from 'react-marketing-tools'
import { fingerprintjs } from 'react-marketing-tools/fingerprintjs'

export const analytics = createAnalytics({
  consent: 'denied',
  visitorId: { fingerprint: fingerprintjs() },
})
```

- It's computed only with both `analytics` and `ads` consent, once per page load, and kept in memory, never stored.
- FingerprintJS is downloaded (as a separate chunk of your bundle) the first time the ID is needed, and loaded with
  `monitoring: false`, which turns off its statistics request to FingerprintJS's servers.
- Use version 5, which is MIT-licensed. Version 4 is under the Business Source License, and the library's peer
  dependency range excludes it.
- A fingerprint can change when the browser or device changes, for example after an update, and identical devices can
  share one.

Any function that resolves a non-empty string works, such as another fingerprinting library or a paid service. Import
it inside the function, so it's only downloaded once consent allows:

```ts
visitorId: {
  fingerprint: async () => {
    const { getFingerprint } = await import('./my-fingerprint')
    return getFingerprint()
  },
},
```

If the function fails or resolves an empty value, the library reports `visitor_id_failed` to `onError`, and that page
load has no visitor ID.

## Where it goes

| Destination | Gets the visitor ID |
| --- | --- |
| Google Analytics 4 | never |
| Google Tag Manager dataLayer | no |
| Meta Pixel | no |
| [Relay to the Conversions API](./meta-conversions-api.md#relaying-the-pixels-events) | as `external_id` (hashed on your server) for visitors who aren't identified with `identify()`, with `adUserData` consent |
| Your code | through `getVisitorId()` |

For identified visitors, the relay sends their user ID as `external_id` instead, which is also what the Pixel's advanced
matching knows. With a fingerprint, events tracked in the moment before it's ready (just after `start()`) are relayed
without one.

`reset()` on sign-out doesn't change the visitor ID: it identifies the browser, not the user.

## Consent

The visitor ID follows the consent state your app gives the library (see [Consent](./consent.md)): the random ID needs
`analytics`, and a fingerprint needs `analytics` and `ads`. Whether and how you ask visitors for consent is up to you.

## Options

| `visitorId` | What it does |
| --- | --- |
| `'random'` (default) | A random ID in `localStorage`, with `analytics` consent. |
| `{ fingerprint }` | Your function's fingerprint, with `analytics` and `ads` consent, never stored. |
| `false` | No visitor ID. |

`createAnalytics()` throws straight away if `visitorId` is anything else.
