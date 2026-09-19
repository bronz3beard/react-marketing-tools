# Meta Conversions API

The browser Pixel misses events that ad blockers and browser privacy features stop, and events that never happen in the
browser. The [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api) sends events to Meta
from your server, with customer information normalised and SHA-256 hashed the way Meta requires. There are two ways to
use it:

- [Relay the Pixel's events](#relaying-the-pixels-events) through your server, so Meta gets each one from both and counts
  it once.
- [Send events only your server sees](#sending-an-event), such as a purchase confirmed by a payment webhook.

Both run anywhere with `fetch` and Web Crypto: Node.js 22.12 or later, and edge runtimes.

## Setup

1. In Meta Events Manager, open your dataset (the Pixel), then **Settings → Conversions API → Generate access token**.
2. Keep the token on your server, for example in `META_CAPI_TOKEN`. Never send it to the browser.

## Relaying the Pixel's events

Point the page at an endpoint on your site:

```ts
createAnalytics({
  consent: 'denied',
  metaPixel: { pixelId: '1234567890123456' },
  server: { endpoint: '/api/track' },
})
```

and mount the handler there:

```ts
// app/api/track/route.ts (Next.js App Router)
import { createTrackHandler } from 'react-marketing-tools/server'

export const POST = createTrackHandler({
  allowedOrigins: ['https://shop.example.com'],
  meta: { pixelId: '1234567890123456', accessToken: process.env.META_CAPI_TOKEN! },
})
```

For every event the Pixel receives, the page posts the same Meta event name, parameters and event ID to your endpoint
with `navigator.sendBeacon`, which still delivers when the visitor leaves the page. The handler adds the visitor's IP
address and user agent from the request, hashes the customer information (see
[Customer information](#customer-information)), and sends the event to the Conversions API. Meta receives the event from
both and counts it once.

- Nothing is relayed without `adUserData` consent, the signal the Pixel follows. The handler also ignores events whose
  body says it's denied.
- The user identified with `identify()` is sent with every event, with the Meta click and browser IDs (`fbc`, `fbp`).
  For a visitor who isn't identified, their [visitor ID](./visitor-id.md) is sent as `external_id` instead.
  Unlike the Pixel, which only takes user data when it initialises, the relay picks up a sign-in straight away.
- Page views are relayed only when there's no Pixel, or its page views are manual (`metaPixel.pageViews: 'manual'`). The
  Pixel's automatic page views carry no event ID, so a relayed copy would be counted twice.
- Nothing is forwarded to GA4, which can't deduplicate events: each one would be counted twice.

The handler is a Web-standard `(request: Request) => Promise<Response>`, so it mounts as it is in Next.js, Remix,
SvelteKit, Hono, Bun, Deno and Cloudflare Workers. With Express, convert the request:

```ts
app.post('/api/track', express.text({ limit: '16kb' }), async (req, res) => {
  const response = await handleTrack(
    new Request('http://localhost/api/track', {
      method: 'POST',
      headers: {
        origin: req.get('origin') ?? '',
        'user-agent': req.get('user-agent') ?? '',
        'x-forwarded-for': req.ip ?? '', // set Express's `trust proxy` behind a proxy
      },
      body: req.body,
    }),
  )
  res.sendStatus(response.status)
})
```

The handler answers:

| Status | When |
| --- | --- |
| 204 | The event was sent to Meta, or the visitor denied consent and it wasn't |
| 400 | The body isn't a relayed event, or the request has no `User-Agent` |
| 403 | The `Origin` header isn't one of `allowedOrigins` |
| 405 | The request isn't a `POST` |
| 413 | The body is over 16 KB |
| 502 | Meta rejected the event or couldn't be reached; the details go to `onError` (default `console.error`) |

`allowedOrigins` lists exact origins, such as `https://shop.example.com`. It stops other websites from sending events
through their visitors' browsers but, like any public analytics endpoint, not someone who calls it directly. Browsers
send `Origin: null` from pages with `Referrer-Policy: no-referrer`, which the handler rejects.

The IP address is the first entry of the `X-Forwarded-For` header, which hosting platforms and CDNs set. If your server
isn't behind one, set the header yourself, as the Express example does.

| Handler option | Default | What it does |
| --- | --- | --- |
| `allowedOrigins` | required | The origins allowed to send events. |
| `meta` | required | `{ pixelId, accessToken, testEventCode?, graphApiVersion? }`, as for `sendConversionsApiEvent`. |
| `onError` | `console.error` | Receives Meta's rejections and network failures. |

## Sending an event

```ts
import { sendConversionsApiEvent } from 'react-marketing-tools/server'

const result = await sendConversionsApiEvent({
  pixelId: '1234567890123456',
  accessToken: process.env.META_CAPI_TOKEN!,
  events: [
    {
      eventName: 'Purchase',
      eventSourceUrl: 'https://shop.example.com/checkout',
      userData: {
        email: order.email,
        phone: order.phone,
        externalId: order.userId,
        clientIpAddress: order.ipAddress,
        clientUserAgent: order.userAgent,
        fbc: order.fbc,
        fbp: order.fbp,
      },
      customData: { value: 42, currency: 'USD', content_ids: ['sku1'], content_type: 'product' },
    },
  ],
})
if (!result.ok) console.error('Meta did not accept the purchase', result.body)
```

Collect the browser signals when the visitor is on your site, for example with the checkout request:

- `clientIpAddress` and `clientUserAgent`: the request's IP address (behind a proxy, from its forwarding header) and its
  `User-Agent` header.
- `fbc` and `fbp`: from `analytics.getAttribution()` in the browser, sent with the checkout. They're only returned with
  `adUserData` consent (see [Attribution](./attribution-utm.md#meta-click-and-browser-ids)).

`eventName` and `customData` use Meta's names (`Purchase`, `Lead`, `value`, `content_ids`, …); unlike `track()`, the
server functions don't convert GA4 names.

## Customer information

| `userData` | Meta field | Before hashing |
| --- | --- | --- |
| `email` | `em` | trimmed, lowercased |
| `phone` | `ph` | digits only, no leading zeros; include the country code |
| `firstName` | `fn` | lowercased, letters only |
| `lastName` | `ln` | lowercased, letters only |
| `externalId` | `external_id` | trimmed |
| `clientIpAddress` | `client_ip_address` | sent as it is, never hashed |
| `clientUserAgent` | `client_user_agent` | sent as it is, never hashed |
| `fbc` | `fbc` | sent as it is, never hashed |
| `fbp` | `fbp` | sent as it is, never hashed |

Values that are already SHA-256 hashes (64 hexadecimal characters) are sent unchanged, and values that are empty after
normalising are left out. Personal data in `customData`, such as an email address, is replaced with `[redacted]` and
reported in `warnings`.

## Website events

Events default to `actionSource: 'website'`, which Meta requires to include `eventSourceUrl` and
`userData.clientUserAgent`; the function rejects without sending if either is missing. Set `actionSource` for other
events, such as `'physical_store'` or `'system_generated'`.

## Deduplication

Meta counts an event once when the Pixel and the Conversions API send it with the same event name and event ID, within
48 hours. The [relay](#relaying-the-pixels-events) does this for every Pixel event. Events only your server sees don't
need an ID; just don't also track them in the browser.

## Consent

The Conversions API has no consent field, so only send events for visitors who granted advertising consent
(`adUserData`), the same signal the browser Pixel follows (see [Consent](./consent.md)).

## Testing

1. In Events Manager, open your dataset, choose **Test events**, and copy the test code from the server events tab.
2. Pass it as `testEventCode`, send an event, and check it appears with the expected name, parameters and matched
   customer information.
3. Remove `testEventCode` in production.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `pixelId` | required | Your numeric Pixel (dataset) ID. |
| `accessToken` | required | The Conversions API access token. |
| `events` | required | 1 to 1,000 events. See the event fields below. |
| `testEventCode` | none | Shows the events in Events Manager → Test events. |
| `graphApiVersion` | `'v26.0'` | The Graph API version, also exported as `META_GRAPH_API_VERSION`. |

| Event field | Default | What it does |
| --- | --- | --- |
| `eventName` | required | A Meta standard event (`Purchase`, `Lead`, …) or a custom name. |
| `eventId` | none | The browser Pixel's event ID for the same action. See [Deduplication](#deduplication). |
| `eventTime` | now | A `Date`. |
| `actionSource` | `'website'` | Where the event happened. See [Website events](#website-events). |
| `eventSourceUrl` | none | The page URL; required for website events. |
| `userData` | required | See [Customer information](#customer-information). |
| `customData` | none | `value`, `currency`, `content_ids`, `contents`, … |

## Result

`sendConversionsApiEvent()` resolves with `{ ok, status, body, warnings }`, where `body` is Meta's response (for example
`{ events_received: 1, fbtrace_id: '…' }`, or `{ error: … }` when Meta rejects the request). An HTTP error resolves with
`ok: false` rather than throwing, so a webhook can log it and carry on. Invalid arguments reject with a `TypeError`
before anything is sent, and a network failure rejects.
