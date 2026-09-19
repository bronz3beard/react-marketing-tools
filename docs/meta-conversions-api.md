# Meta Conversions API

The browser Pixel misses events that ad blockers and browser privacy features stop, and events that never happen in the
browser. `sendConversionsApiEvent` sends events to Meta from your server through the
[Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api), with customer information
normalised and SHA-256 hashed the way Meta requires.

```ts
import { sendConversionsApiEvent } from 'react-marketing-tools/server'
```

It runs anywhere with `fetch` and Web Crypto: Node.js 22.12 or later, and edge runtimes.

## Setup

1. In Meta Events Manager, open your dataset (the Pixel), then **Settings → Conversions API → Generate access token**.
2. Keep the token on your server, for example in `META_CAPI_TOKEN`. Never send it to the browser.

## Sending an event

```ts
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

If the browser Pixel also sends the same action, Meta counts it once when both have the same event name and event ID.
Pass the Pixel's event ID as `eventId`. The library gives every browser event an ID, and the relay coming in the next
release passes it to your server for you. Events only your server sees don't need one.

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
