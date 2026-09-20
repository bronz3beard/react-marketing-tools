# Sending events to other tools

The library ships destinations for Google Tag Manager, Google Analytics 4 and the Meta Pixel. Anything else — PostHog,
Umami, Plausible, Matomo, your own warehouse — you add yourself in a few lines. Your event names, parameters, consent
state and campaign data all reach it, because every destination receives the same event.

```ts
import { createAnalytics, type Destination } from 'react-marketing-tools/core'
```

## What a destination is

| Method | Required | When it's called |
| --- | --- | --- |
| `name` | yes | identifies it in error messages |
| `start({ consent, identity })` | yes | once, in the browser, when `analytics.start()` runs |
| `track(event)` | yes | every `track()` call, and every `page()` unless you add `page` |
| `page(event)` | no | page views only |
| `consent(state)` | no | every `consent.update()`, in order with events |
| `identify(identity)` | no | `identify()` |
| `reset()` | no | `reset()` |

Each event carries `name`, `params`, `eventId` (the same ID every destination gets), `timestamp`, the last campaign
`attribution`, and any per-call `options`.

Two things the library guarantees: your destination runs **after** the built-in ones, and if it throws, the error is
reported to `onError` and the other destinations still receive the event.

## PostHog

PostHog's own script is loaded by you, as their docs describe. The adapter is then about twenty lines:

```ts
import posthog from 'posthog-js'
import { createAnalytics, type Destination } from 'react-marketing-tools/core'

const postHog: Destination = {
  name: 'posthog',
  start({ consent, identity }) {
    // PostHog is opted in by default; follow the visitor's analytics choice.
    if (consent.analytics === 'granted') posthog.opt_in_capturing()
    else posthog.opt_out_capturing()

    if (identity) posthog.identify(identity.userId)
  },
  track({ name, params, eventId }) {
    posthog.capture(name, { ...params, $insert_id: eventId })
  },
  consent(state) {
    if (state.analytics === 'granted') posthog.opt_in_capturing()
    else posthog.opt_out_capturing()
  },
  identify({ userId, traits }) {
    // Traits are personal data; send only what you mean to store in PostHog.
    posthog.identify(userId, { email: traits.email })
  },
  reset() {
    posthog.reset()
  },
}

export const analytics = createAnalytics({
  consent: 'denied',
  ga4: { measurementId: 'G-XXXXXXX' },
  destinations: [postHog],
})
```

## Umami

```ts
import { createAnalytics, type Destination } from 'react-marketing-tools/core'

type Umami = {
  track: (name: string, data?: Record<string, unknown>) => void
  identify: (id: string, data?: Record<string, unknown>) => void
}

const umami = (): Umami | undefined => (window as Window & { umami?: Umami }).umami

const umamiDestination: Destination = {
  name: 'umami',
  start() {},
  track({ name, params }) {
    umami()?.track(name, params)
  },
  identify({ userId }) {
    umami()?.identify(userId)
  },
}
```

Umami's script is cookieless and collects no personal data, which is why this adapter has no consent handling. Check
that this matches how you've configured it before you rely on it.

## Anything with an HTTP endpoint

Plausible (`window.plausible(name, { props })`), Matomo (`window._paq.push([...])`) and self-hosted collectors follow
the same shape. For a warehouse or your own endpoint, post the event as it is:

```ts
const warehouse: Destination = {
  name: 'warehouse',
  start() {},
  track(event) {
    const body = JSON.stringify(event)
    // A beacon still arrives when the visitor leaves the page.
    if (!navigator.sendBeacon('/api/events', body)) {
      void fetch('/api/events', { method: 'POST', body, keepalive: true })
    }
  },
}
```

Check each vendor's current documentation for their method names before you ship: they change on their schedule, not
this library's.

## Consent is yours to map

Nothing about a custom destination is consent-gated automatically. The library tells you the state, and you decide:

- Gate analytics tools on `consent.analytics`.
- Gate advertising tools on `consent.adUserData`, like the Meta Pixel does.
- Read the state at any time with `analytics.consent.get()`, and react to changes in the `consent(state)` method.

## Doing it on the server instead

Rather than loading several vendor scripts in the browser, you can send events once to your own endpoint and fan out
from there. `server: { endpoint: '/api/track' }` already posts every Meta-bound event to your server for the
[Conversions API relay](./meta-conversions-api.md#relaying-the-pixels-events); a destination like the warehouse one
above does the same for everything else. Your server then forwards to whichever tools you use, with their secrets
never leaving it.

## Screaming Frog and other crawlers

Screaming Frog is an SEO crawler, not a place to send events: it reads your pages, and can pull data from the GA4 and
Search Console APIs. It can't receive events from this library.

Where it does help is checking that your tracking is actually on the page. Crawl with JavaScript rendering enabled and
add a Custom JavaScript extraction like this, to see every URL where tracking failed to start:

```js
return typeof window.dataLayer === 'undefined'
  ? 'no dataLayer'
  : window.dataLayer.some(entry => entry && entry['gtm.start'])
    ? 'tag manager ok'
    : 'dataLayer present, container missing'
```

## Why the library doesn't ship these

Every vendor adapter is a promise to follow someone else's API forever, plus an optional dependency, a size budget and
tests. Keeping them in your own codebase means an API change is a five-line fix you make on the day, not a wait for a
release here. If you think one belongs in the library, open an issue and say which one and why.
