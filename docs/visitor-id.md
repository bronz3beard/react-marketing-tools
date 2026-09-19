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
storage, so it survives cleared site data. It's more intrusive, so it needs more consent (see [Legal](#legal)).

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

## Legal

This isn't legal advice; check with your data protection officer or lawyer.

- In the EU, keeping an ID in the browser's storage and reading a device's characteristics to fingerprint it both fall
  under Article 5(3) of the ePrivacy Directive: unless strictly necessary for a service the visitor asked for, they
  need the visitor's consent. The European Data Protection Board's
  [Guidelines 2/2023 on the technical scope of Article 5(3)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en)
  (final version adopted 16 October 2024) cover techniques beyond cookies, building on the Article 29 Working Party's
  Opinion 9/2014 on device fingerprinting.
- In the UK, the ICO says "businesses must give users fair choices over whether to be tracked before using
  fingerprinting technology, including obtaining consent from their users where necessary"
  ([19 December 2024](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2024/12/our-response-to-google-s-policy-change-on-fingerprinting/)).
- A visitor ID is an online identifier, which makes it personal data under the GDPR (Article 4(1)). Cover it in your
  privacy notice and your access and erasure processes.

What the library does for you: nothing is stored or computed before `start()` and the consent it needs, the stored ID
is erased when analytics consent is withdrawn, fingerprinting needs advertising consent as well, and the ID never
reaches Google Analytics.

## Options

| `visitorId` | What it does |
| --- | --- |
| `'random'` (default) | A random ID in `localStorage`, with `analytics` consent. |
| `{ fingerprint }` | Your function's fingerprint, with `analytics` and `ads` consent, never stored. |
| `false` | No visitor ID. |

`createAnalytics()` throws straight away if `visitorId` is anything else.
