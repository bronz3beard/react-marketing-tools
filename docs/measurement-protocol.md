# GA4 Measurement Protocol

Some events never happen in the browser: a payment confirmed by a webhook, a refund, a subscription renewal.
`sendMeasurementProtocolEvent` sends them to GA4 from your server through the
[Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4), attached to the
visitor's existing GA4 client and session.

```ts
import { readGa4Cookies, sendMeasurementProtocolEvent } from 'react-marketing-tools/server'
```

It runs anywhere with `fetch` and Web Crypto: Node.js 22.12 or later, and edge runtimes.

## Setup

1. In GA4, open **Admin → Data streams**, choose your web stream, then **Measurement Protocol API secrets → Create**.
2. Keep the secret on your server, for example in `GA4_API_SECRET`. Google says it must not be exposed in client code.

## Sending an event

A webhook request doesn't carry the visitor's cookies, so keep their GA4 IDs when they start checkout and use them when
the payment is confirmed:

```ts
// When the visitor starts checkout (a request from their browser)
const { clientId, sessionId } = readGa4Cookies({
  cookieHeader: request.headers.get('cookie') ?? '',
  measurementId: 'G-XXXXXXX',
})
await saveOrder({ id: orderId, ga4ClientId: clientId, ga4SessionId: sessionId })

// When the payment webhook confirms the order
if (order.ga4ClientId) {
  const result = await sendMeasurementProtocolEvent({
    measurementId: 'G-XXXXXXX',
    apiSecret: process.env.GA4_API_SECRET!,
    clientId: order.ga4ClientId,
    sessionId: order.ga4SessionId,
    userId: order.userId,
    events: [
      {
        name: 'purchase',
        params: { transaction_id: order.id, value: order.total, currency: 'USD' },
      },
    ],
  })
  if (!result.ok) console.error('GA4 did not accept the purchase', result.status)
}
```

`readGa4Cookies()` reads the client ID from the `_ga` cookie and the session ID from `_ga_<stream>` (both the older
`GS1` and the current `GS2` formats). Without a `_ga` cookie, GA4 has no record of the visitor (for example because they
denied analytics consent), so don't send their events.

Every event gets `session_id` (when you pass `sessionId`) and `engagement_time_msec: 1`, which GA4 needs to show the
event in the visitor's session and in reports such as Realtime. Set `engagement_time_msec` in an event's params to
override it.

Don't send an event from the server that the browser also tracks: GA4 doesn't deduplicate them.

## AI crawlers

`sendAiCrawlerEvent()` sends a crawler's visit through the same API, tagged so it can't be counted as a person, and it
insists that you keep that traffic out of your visitor reports. See
[Measuring AI activity](./ai-traffic.md#ai-crawlers).

## Consent

The Measurement Protocol has no analytics-storage signal, so only send events for visitors who granted analytics
consent. Pass their advertising consent so GA4 treats ad signals the same way as in the browser:

```ts
sendMeasurementProtocolEvent({
  // …
  consent: { adUserData: 'granted', adPersonalization: 'denied' },
})
```

## Checking your events

GA4 accepts malformed events without an error. While you build, pass `validate: true`: the events go to the validation
endpoint, nothing is recorded, and GA4's findings come back as `validationMessages`.

```ts
const { ok, validationMessages } = await sendMeasurementProtocolEvent({
  // …
  validate: true,
})
```

The library also checks events against the same rules as `track()` (see [Tracking events](./tracking-events.md)):

- An invalid event name, measurement ID, missing API secret or client ID, an email address as `userId`, or more than 25
  events reject with a `TypeError` before anything is sent.
- Param values over GA4's limits are reported in `warnings`, and personal data in params (such as email addresses) is
  replaced with `[redacted]` and reported there too. The event is still sent.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `measurementId` | required | Your web stream's measurement ID, `G-XXXXXXX`. |
| `apiSecret` | required | The Measurement Protocol API secret. |
| `clientId` | required | The visitor's GA4 client ID, from `readGa4Cookies()`. |
| `sessionId` | none | The visitor's GA4 session ID, from `readGa4Cookies()`. |
| `userId` | none | Your own user ID, the same one you pass to `identify()`. |
| `events` | required | 1 to 25 `{ name, params? }` events. |
| `consent` | none | `{ adUserData?, adPersonalization? }`, each `'granted'` or `'denied'`. |
| `validate` | `false` | Send to the validation endpoint instead. See [Checking your events](#checking-your-events). |
| `region` | `'global'` | `'eu'` sends to `region1.google-analytics.com`, so collection happens in the EU. |

## Result

`sendMeasurementProtocolEvent()` resolves with `{ ok, status, warnings, validationMessages? }`. An HTTP error resolves
with `ok: false` rather than throwing, so a webhook can log it and carry on. A network failure rejects.
