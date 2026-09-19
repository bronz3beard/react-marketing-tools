# Configuration

`createAnalytics(config)` takes one object:

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `consent` | `'granted' \| 'denied'` | required | The consent state before the visitor makes a choice. It is required so every site decides deliberately. Consent Mode support (mapping it to Google and Meta) arrives in a later alpha. |
| `gtm` | `{ containerId: string; loadScript?: boolean }` | none | Sends events to the Google Tag Manager dataLayer. See [Google Tag Manager](./google-tag-manager.md). |
| `destinations` | `Destination[]` | `[]` | Your own destinations, which receive every event alongside the built-in ones. |
| `nonce` | `string` | none | Content-Security-Policy nonce added to every script the library injects. |

`createAnalytics()` throws straight away if `consent` isn't `'granted'` or `'denied'`, or if `gtm.containerId` doesn't
look like `GTM-XXXXXXX`, so configuration mistakes show up on the first page load.

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

A destination is an object with a `name`, a `start()` that runs once in the browser, and a `track(event)`:

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
