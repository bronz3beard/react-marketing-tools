# Getting started

> **1.0 is in alpha.** `npm install react-marketing-tools` still installs 0.4.x. The 1.0 API is published on the `next`
> tag and grows release by release. This page documents only what has been released; see the [changelog](./CHANGELOG.md).

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

- [React](./react.md): the provider and hook, Next.js App Router, page views in single-page apps
- [Tracking events](./tracking-events.md): naming rules, page views, users, personal data and errors
- [Configuration](./configuration.md): every option
- [Consent](./consent.md): Consent Mode v2 and Global Privacy Control
- [Attribution](./attribution-utm.md): UTM params and ad click IDs
- [Google Tag Manager](./google-tag-manager.md): what reaches the dataLayer and how to use it in GTM
- [Google Analytics 4](./google-analytics-4.md): events, user ids and page views through gtag.js
- [Meta Pixel](./meta-pixel.md): standard events, consent and advanced matching
- [Server-side tagging](./server-side-tagging.md): send hits through your own domain
- [GA4 Measurement Protocol](./measurement-protocol.md) and [Meta Conversions API](./meta-conversions-api.md): send
  events from your server
