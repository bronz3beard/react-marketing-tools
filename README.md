# React Marketing Tools

[![npm next](https://img.shields.io/npm/v/react-marketing-tools/next?label=npm%40next)](https://www.npmjs.com/package/react-marketing-tools?activeTab=versions)
[![license](https://img.shields.io/npm/l/react-marketing-tools)](./LICENSE)

One `track()` call for Google Tag Manager, Google Analytics 4 and the Meta Pixel, with Consent Mode v2, UTM attribution
and personal-data redaction built in.

> **1.0 is in alpha** on the `next` tag. `npm install react-marketing-tools` still installs 0.4.x, whose API 1.0
> replaces; see the [changelog](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/CHANGELOG.md).

## Install

```sh
npm install react-marketing-tools@next
```

Requires React 18 or 19. The package is ESM-only; server rendering needs Node.js 22.12 or later.

## Usage

Create one instance:

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  consent: 'denied', // until your consent banner records the visitor's choice
  gtm: { containerId: 'GTM-XXXXXXX' },
  ga4: { measurementId: 'G-XXXXXXX' },
  metaPixel: { pixelId: '1234567890123456' },
})
```

Provide it to your app:

```tsx
// main.tsx
import { AnalyticsProvider } from 'react-marketing-tools'
import { analytics } from './analytics'

createRoot(document.getElementById('root')!).render(
  <AnalyticsProvider analytics={analytics}>
    <App />
  </AnalyticsProvider>,
)
```

Track from any component:

```tsx
import { useAnalytics } from 'react-marketing-tools'

export const SignUpButton = () => {
  const { track } = useAnalytics()

  // Reaches GTM, GA4 and Meta (as CompleteRegistration) with one shared event_id
  return <button onClick={() => track('sign_up', { method: 'google' })}>Sign up</button>
}
```

The same instance identifies users and records consent:

```ts
analytics.identify('user-42', { email: 'ada@example.com' }) // user id for GTM and GA4, advanced matching for Meta
analytics.consent.update({ analytics: 'granted', ads: 'granted' }) // Google Consent Mode v2 and Meta consent
```

Configure only the destinations you use. Without React, import `createAnalytics` from `react-marketing-tools/core` and
call `analytics.start()` yourself.

Send events that happen on your server, such as a purchase confirmed by a payment webhook, from
`react-marketing-tools/server`:

```ts
import { sendMeasurementProtocolEvent } from 'react-marketing-tools/server'

await sendMeasurementProtocolEvent({
  measurementId: 'G-XXXXXXX',
  apiSecret: process.env.GA4_API_SECRET!,
  clientId: order.ga4ClientId, // saved at checkout with readGa4Cookies()
  events: [{ name: 'purchase', params: { transaction_id: order.id, value: 42, currency: 'USD' } }],
})
```

`sendConversionsApiEvent` does the same for Meta, hashing customer information as Meta requires.

## Documentation

- [Getting started](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/getting-started.md)
- [React](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/react.md): provider, hook, Next.js App Router, single-page apps
- [Tracking events](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/tracking-events.md): naming rules, page views, users, personal data, errors
- [Configuration](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/configuration.md)
- [Consent](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/consent.md): Consent Mode v2 and Global Privacy Control
- [Attribution](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/attribution-utm.md): UTM params and ad click IDs
- [Google Tag Manager](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/google-tag-manager.md)
- [Google Analytics 4](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/google-analytics-4.md)
- [Meta Pixel](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/meta-pixel.md)
- [Server-side tagging](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/server-side-tagging.md)
- [GA4 Measurement Protocol](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/measurement-protocol.md): GA4 events from your server
- [Meta Conversions API](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/meta-conversions-api.md): Meta events from your server
- [Changelog](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/CHANGELOG.md)

## License

[MIT](./LICENSE)
