# Getting started

> **1.0 is in beta.** `npm install react-marketing-tools` still installs 0.4.x, which works differently. The 1.0 API is
> published under the `next` label; see the [changelog](./CHANGELOG.md) and the
> [migration guide](./migration-v1.md).

## What you need first

The library sends events to accounts you already have; it doesn't create them. Have ready the IDs of the services you
want to use: a Google Tag Manager container (`GTM-XXXXXXX`), a Google Analytics 4 web data stream (`G-XXXXXXX`), and a
Meta Pixel dataset ID. For sending events from your server you also need a GA4 API secret and a Meta Conversions API
access token, both kept on the server.

With Tag Manager, your container decides what happens to each event: the library puts events in the dataLayer, and
nothing is forwarded until you add a trigger and a tag for that event name. Google Analytics 4 records events as soon
as they arrive, under the name you tracked.

## Install

```sh
npm install react-marketing-tools@next
```

The package is ESM-only. Server rendering and build tooling need Node.js 22.12 or later.

## Send your first event

Create one analytics instance at module scope:

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  consent: 'granted',
  gtm: { containerId: 'GTM-XXXXXXX' },
})
```

Wrap your app once:

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

Track from any component:

```tsx
import { useAnalytics } from 'react-marketing-tools'

export const SignUpButton = () => {
  const { track } = useAnalytics()
  return <button onClick={() => track('sign_up', { method: 'google' })}>Sign up</button>
}
```

- `createAnalytics()` has no side effects, so it is safe to import during server rendering.
- The provider calls `analytics.start()` once your app mounts. That loads the Google Tag Manager container and sends
  anything tracked earlier, in order, including events components track when they first mount.
- On the server, `start()` and `track()` do nothing.

Using Next.js or a router? See [React](./react.md).

### Without React

Import from `react-marketing-tools/core` and call `analytics.start()` yourself once the page has loaded:

```ts
import { createAnalytics } from 'react-marketing-tools/core'

const analytics = createAnalytics({ consent: 'granted', gtm: { containerId: 'GTM-XXXXXXX' } })
analytics.start()
analytics.track('sign_up', { method: 'google' })
```

## Next steps

- [React](./react.md): the provider and hook, page views in single-page apps
- [Next.js](./nextjs.md): a complete App Router setup, client and server
- [Tracking events](./tracking-events.md): naming rules, page views, journeys, click autocapture, Web Vitals, users,
  personal data and errors
- [Configuration](./configuration.md): every option
- [Consent](./consent.md): Consent Mode v2 and Global Privacy Control
- [Attribution](./attribution-utm.md): UTM params and ad click IDs
- [Visitor ID](./visitor-id.md): a stable ID for consenting visitors, random or fingerprint
- [Google Tag Manager](./google-tag-manager.md): what reaches the dataLayer and how to use it in GTM
- [Google Analytics 4](./google-analytics-4.md): events, user ids and page views through gtag.js
- [Meta Pixel](./meta-pixel.md): standard events, consent and advanced matching
- [Server-side tagging](./server-side-tagging.md): send hits through your own domain
- [GA4 Measurement Protocol](./measurement-protocol.md) and [Meta Conversions API](./meta-conversions-api.md): send
  events from your server
