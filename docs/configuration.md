# Configuration

`createAnalytics(config)` takes one object:

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `consent` | `'granted' \| 'denied'` | required | The consent state before the visitor makes a choice. It is required so every site decides deliberately. Consent Mode support (mapping it to Google and Meta) arrives in a later alpha. |
| `gtm` | `{ containerId: string; loadScript?: boolean; scriptUrl?: string }` | none | Sends events to the Google Tag Manager dataLayer. See [Google Tag Manager](./google-tag-manager.md). |
| `ga4` | `{ measurementId: string; pageViews?: 'auto' \| 'manual'; loadScript?: boolean; serverContainerUrl?: string }` | none | Sends events to Google Analytics 4 through gtag.js. See [Google Analytics 4](./google-analytics-4.md). |
| `destinations` | `Destination[]` | `[]` | Your own destinations, which receive every event alongside the built-in ones. |
| `nonce` | `string` | none | Content-Security-Policy nonce added to every script the library injects. |
| `debug` | `boolean` | `false` | Throw on invalid events and personal data instead of reporting them. Turn on in development. See [Errors](./tracking-events.md#errors). |
| `onError` | `(error: AnalyticsError) => void` | `console.error` | Receives every problem the library reports. |

`createAnalytics()` throws straight away if `consent` isn't `'granted'` or `'denied'`, if `gtm.containerId` doesn't look
like `GTM-XXXXXXX`, if `ga4.measurementId` doesn't look like `G-XXXXXXX`, or if `gtm.scriptUrl` or
`ga4.serverContainerUrl` isn't an `https://` URL. Configuration mistakes show up on the first page load.

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
