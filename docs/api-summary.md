# API summary

Everything the library exposes, on one page, for when you (or an AI assistant) need the whole surface without reading
eighteen guides. Each row links to the guide that explains it properly.

A CI check fails if anything public is missing from this page, so it can't quietly fall behind the code.

## Entry points

| Import from | Contains | Runs in |
| --- | --- | --- |
| `react-marketing-tools` | `createAnalytics`, `AnalyticsProvider`, `useAnalytics`, every type | the browser (marked as client code) |
| `react-marketing-tools/core` | the same, without the React bindings | the browser, any framework |
| `react-marketing-tools/server` | Measurement Protocol, Conversions API, the relay handler, AI crawler helpers | Node.js 22.12+ and edge runtimes |
| `react-marketing-tools/fingerprintjs` | `fingerprintjs()`, an adapter for the optional FingerprintJS peer | the browser |
| `react-marketing-tools/web-vitals` | `trackWebVitals()`, using the optional `web-vitals` peer | the browser |
| `react-marketing-tools/package.json` | the manifest, for tooling | anywhere |

## `createAnalytics(config)`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `consent` | `'granted' \| 'denied'` | **required** | Starting state for every purpose. [Consent](./consent.md) |
| `respectGpc` | `boolean` | `true` | Global Privacy Control starts the advertising purposes denied |
| `attribution` | `boolean \| { ttlDays?: number; aiSources?: Record<string, string[]> }` | `true`, 90 days | UTM and click IDs; `aiSources` labels AI-assistant visits. [Attribution](./attribution-utm.md), [AI activity](./ai-traffic.md) |
| `visitorId` | `'random' \| false \| { fingerprint: () => Promise<string> }` | `'random'` | Consent-gated, never sent to GA4. [Visitor ID](./visitor-id.md) |
| `autocapture` | `{ clicks?: boolean }` | off | Tracks clicks on `data-analytics-event` elements. [Autocapture](./tracking-events.md#click-autocapture) |
| `gtm` | `{ containerId: string; loadScript?: boolean; scriptUrl?: string; waitForUpdate?: number }` | none | [Google Tag Manager](./google-tag-manager.md) |
| `ga4` | `{ measurementId: string; pageViews?: 'auto' \| 'manual'; loadScript?: boolean; serverContainerUrl?: string; waitForUpdate?: number }` | none | [Google Analytics 4](./google-analytics-4.md) |
| `metaPixel` | `{ pixelId: string; pageViews?: 'auto' \| 'manual'; loadScript?: boolean }` | none | [Meta Pixel](./meta-pixel.md) |
| `server` | `{ endpoint: string }` | none | Relays Pixel events to your endpoint. [Relay](./meta-conversions-api.md#relaying-the-pixels-events) |
| `destinations` | `Destination[]` | `[]` | Your own destinations. [Other tools](./custom-destinations.md) |
| `nonce` | `string` | none | Content-Security-Policy nonce for injected scripts |
| `debug` | `boolean` | `false` | Throw on mistakes instead of reporting them |
| `onError` | `(error: AnalyticsError) => void` | `console.error` | Receives every problem. [Errors](./tracking-events.md#errors) |

Creating an instance has no side effects: nothing loads or is stored until `start()`.

## The instance

| Member | Signature | Notes |
| --- | --- | --- |
| `start` | `() => void` | The React provider calls it. Safe to call twice; does nothing on the server |
| `track` | `(name: string, params?: Record<string, unknown>, options?: TrackOptions) => void` | Queued until `start()` |
| `page` | `(params?: Record<string, unknown>) => void` | Sends `page_view` with `page_location` and `page_title` |
| `journey` | `(name: string) => Journey` | A multi-step flow. [Journeys](./tracking-events.md#journeys) |
| `identify` | `(userId: string, traits?: { email?, phone?, firstName?, lastName? }) => void` | Never sends traits to Google |
| `reset` | `() => void` | Forgets the user, on sign-out |
| `getAttribution` | `() => AttributionSnapshot` | First and last touch, plus `fbc`/`fbp` with consent |
| `getVisitorId` | `() => Promise<string \| undefined>` | Resolves after `start()` |
| `consent` | `{ update(update): void; get(): ConsentState }` | Purposes: `analytics`, `ads`, `adUserData`, `adPersonalization` |

`Journey` has `step(name, params?)`, `complete(params?)` and `abandon(reason?)`.

`TrackOptions` today has one member, `meta`: an object `{ event?, params? }` to change what the Meta Pixel receives, or
`false` to keep the event away from Meta and the relay.

## Writing a destination

`Destination` requires `name`, `start(context)` and `track(event)`, and optionally `page(event)`, `consent(state)`,
`identify(identity)` and `reset()`. Custom destinations run after the built-in ones. [Other tools](./custom-destinations.md)

## `react-marketing-tools/server`

| Export | Kind | Purpose |
| --- | --- | --- |
| `sendMeasurementProtocolEvent` | function | GA4 events from your server. [Measurement Protocol](./measurement-protocol.md) |
| `readGa4Cookies` | function | The visitor's GA4 client and session IDs from a `Cookie` header |
| `sendConversionsApiEvent` | function | Meta events from your server, hashing customer data |
| `createTrackHandler` | function | The relay endpoint: `(Request) => Promise<Response>` |
| `matchAiAgent` | function | Your label for an AI crawler's user agent. [AI activity](./ai-traffic.md#ai-crawlers) |
| `sendAiCrawlerEvent` | function | Crawler visits, tagged and kept out of visitor reports |
| `META_GRAPH_API_VERSION` | constant | The Graph API version used by default |
| `MeasurementProtocolOptions`, `MeasurementProtocolEvent`, `MeasurementProtocolResult` | types | Measurement Protocol |
| `ConversionsApiOptions`, `ConversionsApiEvent`, `ConversionsApiResult`, `ConversionsApiUserData` | types | Conversions API |
| `TrackHandlerOptions` | type | The relay handler |
| `AiAgents`, `AiCrawlerOptions`, `AiCrawlerReporting` | types | AI crawlers |

## Error codes

Passed to `onError`; all but the last two also throw when `debug` is on.

| Code | Means |
| --- | --- |
| `invalid_event` | The event name breaks a GA4 rule; the event is dropped |
| `invalid_param` | A parameter breaks a GA4 limit; the event is still sent |
| `pii_redacted` | Personal data was replaced with `[redacted]` |
| `invalid_user_id` | `identify()` got an empty ID or an email address |
| `invalid_consent` | `consent.update()` got an unknown purpose or value |
| `destination_failed` | A vendor script threw, or the relay couldn't be reached |
| `visitor_id_failed` | The fingerprint function failed |
| `journey_ended` | A journey was used after it completed or was abandoned |

## Limits worth knowing

| Limit | Value |
| --- | --- |
| Event and parameter names | Start with a letter; letters, digits and underscores; 40 characters; not prefixed `google_`, `ga_`, `firebase_` |
| Parameters per event | 25 |
| Text parameter values | 100 characters (`page_location` 1000, `page_title` 300, `page_referrer` 420) |
| Relay request body | 16 KB, else the handler answers 413 |
| Measurement Protocol events per call | 25 |
| Conversions API events per call | 1000 |
| Personal data | Parameters named like `email`, `phone`, `first_name`, `last_name`, `address`, `password`, and anything that looks like an email address, are redacted |

## Requirements

React 18 or 19 (only for the React entry points), ES modules only, Node.js 22.12+ for server use. No runtime
dependencies; `@fingerprintjs/fingerprintjs` and `web-vitals` are optional peers used by their own entry points.
