# Configuration

`createAnalytics(config)` takes one object:

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `consent` | `'granted' \| 'denied'` | required | The consent state for every purpose before the visitor makes a choice. It is required so every site decides deliberately. See [Consent](./consent.md). |
| `attribution` | `boolean \| { ttlDays?: number }` | `true` (90 days) | Capture UTM params and ad click IDs. See [Attribution](./attribution-utm.md). |
| `visitorId` | `'random' \| false \| { fingerprint: () => Promise<string> }` | `'random'` | A stable ID for a consenting visitor, never sent to Google Analytics. See [Visitor ID](./visitor-id.md). |
| `autocapture` | `{ clicks?: boolean }` | off | `clicks: true` tracks clicks on elements with a `data-analytics-event` attribute. See [Click autocapture](./tracking-events.md#click-autocapture). |
| `respectGpc` | `boolean` | `true` | Start advertising consent denied when the browser sends Global Privacy Control. See [Consent](./consent.md#global-privacy-control). |
| `gtm` | `{ containerId: string; loadScript?: boolean; scriptUrl?: string; waitForUpdate?: number }` | none | Sends events to the Google Tag Manager dataLayer. See [Google Tag Manager](./google-tag-manager.md). |
| `ga4` | `{ measurementId: string; pageViews?: 'auto' \| 'manual'; loadScript?: boolean; serverContainerUrl?: string; waitForUpdate?: number }` | none | Sends events to Google Analytics 4 through gtag.js. See [Google Analytics 4](./google-analytics-4.md). |
| `metaPixel` | `{ pixelId: string; pageViews?: 'auto' \| 'manual'; loadScript?: boolean }` | none | Sends events to the Meta Pixel. See [Meta Pixel](./meta-pixel.md). |
| `server` | `{ endpoint: string }` | none | Relays events to your `createTrackHandler()` endpoint, which forwards them to the Meta Conversions API with the Pixel's event ID. See [Relaying the Pixel's events](./meta-conversions-api.md#relaying-the-pixels-events). |
| `destinations` | `Destination[]` | `[]` | Your own destinations, which receive every event alongside the built-in ones. |
| `nonce` | `string` | none | Content-Security-Policy nonce added to every script the library injects. |
| `debug` | `boolean` | `false` | Throw on invalid events and personal data instead of reporting them. Turn on in development. See [Errors](./tracking-events.md#errors). |
| `onError` | `(error: AnalyticsError) => void` | `console.error` | Receives every problem the library reports. |

`createAnalytics()` throws straight away if `consent` isn't `'granted'` or `'denied'`, if `gtm.containerId` doesn't look
like `GTM-XXXXXXX`, if `ga4.measurementId` doesn't look like `G-XXXXXXX`, if `metaPixel.pixelId` isn't numeric, if
`gtm.scriptUrl` or `ga4.serverContainerUrl` isn't an `https://` URL, if `server.endpoint` is neither a path on your
site (`/api/track`) nor an `https://` URL, or if `visitorId` isn't one of its three forms. Configuration mistakes show up on the first page load.

## Events

`analytics.track(name, params)` creates one event and gives it to every destination:

```ts
type AnalyticsEvent = {
  name: string
  params: Record<string, unknown>
  eventId: string // a UUID, unique per track() call and shared by every destination
  timestamp: number // milliseconds since the Unix epoch
}
```

Every destination receives the same `eventId`, so vendors that deduplicate across channels can recognise one event.

## Custom destinations

A destination is an object with a `name`, a `start()` that runs once in the browser, and a `track(event)`. It can also
implement `page(event)` (otherwise page views arrive through `track`), `identify({ userId, traits })` and `reset()`. If a
destination throws, the error goes to `onError` and the other destinations still receive the event.

```ts
import { createAnalytics, type Destination } from 'react-marketing-tools/core'

const consoleDestination: Destination = {
  name: 'console',
  start() {},
  track(event) {
    console.log(event.name, event.params, event.eventId)
  },
}

export const analytics = createAnalytics({
  consent: 'granted',
  destinations: [consoleDestination],
})
```
