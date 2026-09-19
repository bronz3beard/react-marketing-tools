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
import { createAnalytics } from 'react-marketing-tools/core'

export const analytics = createAnalytics({
  consent: 'granted',
  gtm: { containerId: 'GTM-XXXXXXX' },
})
```

Start it once from your browser entry point, then track from anywhere:

```ts
// main.ts
import { analytics } from './analytics'

analytics.start()
```

```ts
analytics.track('sign_up', { method: 'google' })
```

- `createAnalytics()` has no side effects, so it is safe to import during server rendering.
- `start()` loads the Google Tag Manager container and sends any events tracked before it. Calling it again does nothing.
- Events tracked before `start()` are queued and sent in order. On the server, `start()` and `track()` do nothing.

React bindings (`<AnalyticsProvider>` and `useAnalytics()`) arrive in a later alpha. Until then, call `start()` from your
entry point.

## Next steps

- [Configuration](./configuration.md): every option
- [Google Tag Manager](./google-tag-manager.md): what reaches the dataLayer and how to use it in GTM
