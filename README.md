# React Marketing Tools

[![npm next](https://img.shields.io/npm/v/react-marketing-tools/next?label=npm%40next)](https://www.npmjs.com/package/react-marketing-tools?activeTab=versions)
[![license](https://img.shields.io/npm/l/react-marketing-tools)](./LICENSE)

Send one event from your React app and it reaches Google Tag Manager, Google Analytics 4 and the Meta Pixel at once.
The library keeps the visitor's privacy choices, remembers which campaign brought them, strips personal data out of
events, and can send the same events again from your server so they still arrive when a browser blocks tracking.

**[Try it in the playground](https://bronz3beard.github.io/react-marketing-tools/)**: press a button and see exactly
what each of those services would receive. Nothing is sent anywhere.

> **1.0 is in beta.** Install it with `npm install react-marketing-tools@next`, because plain
> `npm install react-marketing-tools` still gives you the old 0.4 version, which works differently. See the
> [migration guide](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/migration-v1.md) if you're
> coming from 0.4, and the
> [changelog](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/CHANGELOG.md) for what's new.

## Contents

- [What you need before you start](#what-you-need-before-you-start)
- [Install](#install)
- [Quick start](#quick-start)
  - [1. Create the analytics instance](#1-create-the-analytics-instance)
  - [2. Hand it to your app](#2-hand-it-to-your-app)
  - [3. Track an event](#3-track-an-event)
- [Track clicks without writing code](#track-clicks-without-writing-code)
- [Follow a multi-step flow](#follow-a-multi-step-flow)
- [Tell the library who the visitor is](#tell-the-library-who-the-visitor-is)
- [Record what the visitor consented to](#record-what-the-visitor-consented-to)
- [Recognise a returning visitor](#recognise-a-returning-visitor)
- [Report how fast your pages are](#report-how-fast-your-pages-are)
- [Send events from your server](#send-events-from-your-server)
  - [A purchase confirmed by a payment webhook](#a-purchase-confirmed-by-a-payment-webhook)
  - [Send the Pixel's events from your server too](#send-the-pixels-events-from-your-server-too)
- [Use it without React](#use-it-without-react)
- [What each service receives](#what-each-service-receives)
- [Documentation](#documentation)
- [License](#license)

## What you need before you start

This library sends events to accounts you already have. It doesn't create or configure them for you, and it isn't a
replacement for them. Before you install it, set up the ones you want to use:

| You want | What you need first | What the library needs from it |
| --- | --- | --- |
| Google Tag Manager | A container, with the tags and triggers that decide what happens to each event | The container ID, like `GTM-XXXXXXX` |
| Google Analytics 4 | A property with a web data stream | The measurement ID, like `G-XXXXXXX` |
| Meta Pixel | A dataset (pixel) in Meta Events Manager | The pixel ID, a long number |
| Events sent from your server to GA4 | An API secret on that same data stream | The secret, kept on your server |
| Events sent from your server to Meta | A Conversions API access token in Events Manager | The token, kept on your server |

Two things worth knowing:

- **With Tag Manager, your container still decides what happens.** The library puts each event into the dataLayer, the
  list of events Tag Manager watches. Until you add a trigger and a tag for an event name, the event is recorded but
  goes nowhere.
- **With Google Analytics 4, events arrive on their own.** They show up as events with the name you tracked. Using the
  names Google recommends, such as `purchase` or `sign_up`, fills in GA4's built-in reports; your own names appear in
  reports and explorations once you use them.

You only configure the services you use. Many teams start with Tag Manager alone and add the rest later.

## Install

```sh
npm install react-marketing-tools@next
```

Works with React 18 and 19. The package is published as ES modules, the `import` style of JavaScript, so it works in
every current bundler and in Node.js 22.12 or later; it can't be loaded with `require()`.

## Quick start

### 1. Create the analytics instance

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  // Nothing is stored or sent until you record the visitor's choice; see "Record what the visitor consented to".
  consent: 'denied',
  gtm: { containerId: 'GTM-XXXXXXX' },
  ga4: { measurementId: 'G-XXXXXXX' },
  metaPixel: { pixelId: '1234567890123456' },
})
```

Creating the instance does nothing on its own: no scripts load and no cookies are written until your app starts it,
which the provider below does. That makes this file safe to import anywhere, including in server-rendered pages.

### 2. Hand it to your app

```tsx
// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'react-marketing-tools'
import { analytics } from './analytics'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnalyticsProvider analytics={analytics}>
      <App />
    </AnalyticsProvider>
  </StrictMode>,
)
```

The provider loads the vendor scripts once your app is running in the browser. Anything you track before that is held
and sent in order afterwards, so you never lose an event that happened during startup.

### 3. Track an event

```tsx
// SignUpButton.tsx
import { useAnalytics } from 'react-marketing-tools'

export const SignUpButton = () => {
  const { track } = useAnalytics()

  return (
    <button onClick={() => track('sign_up', { method: 'google' })}>
      Sign up
    </button>
  )
}
```

That one call reaches all three services: Tag Manager gets a `sign_up` event, Google Analytics 4 gets `sign_up`, and
the Meta Pixel gets `CompleteRegistration`, the name Meta uses for the same thing. All three carry the same event ID,
so when the same action arrives twice, from the browser and from your server, Meta counts it once.

## Track clicks without writing code

Turn it on once, and then mark the elements you care about. No analytics code in your components:

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  consent: 'denied',
  gtm: { containerId: 'GTM-XXXXXXX' },
  autocapture: { clicks: true },
})
```

```tsx
// PricingPage.tsx
export const PricingPage = () => (
  <section>
    <h1>Pricing</h1>
    <button
      data-analytics-event="cta_click"
      data-analytics-param-location="pricing_header"
      data-analytics-param-plan="pro"
    >
      Start free trial
    </button>
  </section>
)
```

A click anywhere inside that button, including on an icon or text inside it, sends the same event as
`track('cta_click', { location: 'pricing_header', plan: 'pro' })`.

- `data-analytics-event` is the event name. Every `data-analytics-param-*` attribute becomes one detail on the event,
  with dashes turned into underscores: `data-analytics-param-button-text` arrives as `button_text`.
- Values are text. For numbers, such as a price you want to add up, call `track()` instead.
- It works for elements added later, for example after a route change, and for links as well as buttons.
- If several marked elements are nested, the closest one to the click wins.

## Follow a multi-step flow

A journey groups the steps of a flow such as a checkout, so you can see where people drop out:

```tsx
// Checkout.tsx
import { useState } from 'react'
import { useAnalytics } from 'react-marketing-tools'

export const Checkout = () => {
  const { journey } = useAnalytics()
  // Create it once for this flow, not on every render: each journey has its own ID.
  const [checkout] = useState(() => journey('checkout'))

  return (
    <>
      <button onClick={() => checkout.step('shipping')}>Continue to payment</button>
      <button onClick={() => checkout.complete({ value: 42, currency: 'USD' })}>Pay</button>
      <button onClick={() => checkout.abandon('changed_mind')}>Cancel</button>
    </>
  )
}
```

The first call also sends a `journey_start` event, and every event in the flow carries the same journey ID. In Google
Analytics 4 you can then build a funnel from `journey_start`, `journey_step` and `journey_complete`.

## Tell the library who the visitor is

```ts
// after your sign-in code succeeds
import { analytics } from './analytics'

analytics.identify('user-42', { email: 'ada@example.com' })
```

The ID is your own user ID: it goes to Tag Manager and Google Analytics 4 so you can join sessions to accounts. The
email address is not sent to Google. It goes only to Meta, which uses contact details to match a visitor to a Facebook
or Instagram account, and it's scrambled into an unreadable fingerprint (a hash) before it's sent. Call
`analytics.reset()` when someone signs out.

## Record what the visitor consented to

```ts
// from your cookie banner, when the visitor answers
import { analytics } from './analytics'

analytics.consent.update({ analytics: 'granted', ads: 'granted' })
```

Until this is called, the instance follows the `consent` value you passed when you created it. The library passes the
choice to Google's Consent Mode, which is how Google's tags are told what a visitor agreed to, and to the Meta Pixel,
which holds events until it's allowed to send them. The same choice controls what the library itself stores in the
browser. Both parts of the choice can be set separately if your banner asks separately.

## Recognise a returning visitor

```ts
import { analytics } from './analytics'

// inside an async function, any time after your app has started
const visitorId = await analytics.getVisitorId()
```

This is a random ID kept in the browser, given only to visitors who consented to analytics, so you can join a person's
visits in your own systems. It's never sent to Google Analytics. You can swap it for a browser fingerprint if you want
to recognise people who clear their cookies; see [Visitor ID](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/visitor-id.md).

## Report how fast your pages are

Core Web Vitals are Google's three measures of page experience: how fast the main content appears, how quickly the page
responds to a tap or click, and how much the layout jumps around. Install Google's measuring library and pass it your
instance:

```sh
npm install web-vitals@^6
```

```ts
// main.tsx, after the render call
import { trackWebVitals } from 'react-marketing-tools/web-vitals'
import { analytics } from './analytics'

void trackWebVitals(analytics)
```

Each measurement arrives as an event named `LCP`, `INP` or `CLS` in Google Analytics 4 and Tag Manager. They're never
sent to Meta.

## Send events from your server

Some things happen where the browser can't see them, such as a payment your payment provider confirms minutes later.
Other events simply never make it, because an extension or browser setting blocks the tracking scripts. For both, send
the event from your server.

### A purchase confirmed by a payment webhook

```ts
// inside your payment webhook, where `order` is the order you just confirmed
import { sendMeasurementProtocolEvent } from 'react-marketing-tools/server'

await sendMeasurementProtocolEvent({
  measurementId: 'G-XXXXXXX',
  apiSecret: process.env.GA4_API_SECRET!,
  // Saved when the visitor started checkout, with readGa4Cookies() from the same import.
  clientId: order.ga4ClientId,
  events: [
    {
      name: 'purchase',
      params: { transaction_id: order.id, value: order.total, currency: 'USD' },
    },
  ],
})
```

The same import has `sendConversionsApiEvent` for Meta, which scrambles customer details into hashes the way Meta
requires before sending them.

### Send the Pixel's events from your server too

Point the page at an address on your own site, and mount the handler there. Every event the Pixel receives is then sent
from your server as well, and Meta counts each one once:

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  consent: 'denied',
  metaPixel: { pixelId: '1234567890123456' },
  server: { endpoint: '/api/track' },
})
```

```ts
// app/api/track/route.ts — a Next.js route; any server that speaks Request and Response works
import { createTrackHandler } from 'react-marketing-tools/server'

export const POST = createTrackHandler({
  allowedOrigins: ['https://shop.example.com'],
  meta: {
    pixelId: '1234567890123456',
    accessToken: process.env.META_CAPI_TOKEN!,
  },
})
```

## Use it without React

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools/core'

export const analytics = createAnalytics({
  consent: 'granted',
  gtm: { containerId: 'GTM-XXXXXXX' },
})

analytics.start() // the React provider does this for you
analytics.track('sign_up', { method: 'google' })
```

## What each service receives

| | Google Tag Manager | Google Analytics 4 | Meta Pixel | Your server, for Meta |
| --- | --- | --- | --- | --- |
| `track()` | the event in the dataLayer, with an event ID | the event through Google's tag | Meta's name for the event, with the same event ID | the same event again, so it still arrives when the browser is blocked |
| `identify()` | your user ID | your user ID | contact details, hashed by the Pixel | contact details, hashed by your server |
| `consent.update()` | Google Consent Mode | Google Consent Mode | permission to send, or to hold | only sends with permission to share data with ad platforms |
| Campaign the visitor came from | the campaign on every event | read from the page address by Google's tag | the Meta click ID | the Meta click and browser IDs |

## Documentation

- [All docs](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/README.md)
- [Getting started](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/getting-started.md)
- [React](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/react.md): provider, hook, single-page apps
- [Next.js](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/nextjs.md): a complete App Router setup, client and server
- [Tracking events](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/tracking-events.md): naming rules, page views, journeys, click autocapture, Web Vitals, users, personal data, errors
- [Configuration](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/configuration.md)
- [Consent](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/consent.md): Consent Mode v2 and Global Privacy Control
- [Attribution](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/attribution-utm.md): UTM params and ad click IDs
- [Visitor ID](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/visitor-id.md): a stable ID for consenting visitors, random or fingerprint
- [Google Tag Manager](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/google-tag-manager.md)
- [Google Analytics 4](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/google-analytics-4.md)
- [Meta Pixel](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/meta-pixel.md)
- [Server-side tagging](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/server-side-tagging.md)
- [GA4 Measurement Protocol](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/measurement-protocol.md): GA4 events from your server
- [Meta Conversions API](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/meta-conversions-api.md): Meta events from your server
- [Error tracking](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/error-tracking.md): report errors to Google Analytics 4
- [Debugging](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/debugging.md): see what's sent, and fix common problems
- [Migrating from 0.4](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/migration-v1.md)
- [Changelog](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/CHANGELOG.md)

## License

[MIT](./LICENSE)
