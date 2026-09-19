# React

```tsx
import {
  AnalyticsProvider,
  createAnalytics,
  useAnalytics,
} from 'react-marketing-tools'
```

Requires React 18 or 19.

## Provider

Create the instance once, at module scope, and pass it to the provider near the root of your app:

```tsx
const analytics = createAnalytics({
  consent: 'granted',
  gtm: { containerId: 'GTM-XXXXXXX' },
})

export const Root = () => (
  <AnalyticsProvider analytics={analytics}>
    <App />
  </AnalyticsProvider>
)
```

The provider calls `analytics.start()` after it mounts. It's safe under `<StrictMode>`: `start()` only runs once.

## Hook

`useAnalytics()` returns the instance, with `track`, `page`, `identify` and `reset`:

```tsx
const Checkout = () => {
  const { track } = useAnalytics()

  // Tracked on mount. React runs this before the provider has started; it's queued and sent once it has.
  useEffect(() => track('begin_checkout'), [track])

  return <button onClick={() => track('purchase', { value: 42, currency: 'USD' })}>Pay</button>
}
```

Calling `useAnalytics()` outside `<AnalyticsProvider>` throws `useAnalytics must be used within <AnalyticsProvider>`.

In development, `<StrictMode>` runs every effect twice, so an event tracked inside `useEffect` is sent twice there. Production
builds run effects once. Events tracked in event handlers are never duplicated.

## Next.js App Router

The package entry is marked `'use client'`. The analytics instance holds functions, so it can't be passed from a Server
Component; create it inside a client module instead:

```tsx
// app/providers.tsx
'use client'

import { AnalyticsProvider, createAnalytics } from 'react-marketing-tools'
import type { ReactNode } from 'react'

const analytics = createAnalytics({
  consent: 'denied',
  gtm: { containerId: process.env.NEXT_PUBLIC_GTM_ID! },
})

export const Providers = ({ children }: { children: ReactNode }) => (
  <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
)
```

```tsx
// app/layout.tsx (a Server Component)
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

Server-only code that needs the core API (without React) can import `react-marketing-tools/core`, which has no
`'use client'` marker.

## Page views in single-page apps

Client-side navigation doesn't reload the page. Either let your tag handle it (for example a *History Change* trigger in
Google Tag Manager), or call `page()` when the route changes. Choose one, so you don't double count.

React Router:

```tsx
import { useLocation } from 'react-router'

const PageViews = () => {
  const { pathname, search } = useLocation()
  const { page } = useAnalytics()

  useEffect(() => page(), [pathname, search, page])
  return null
}
```

Next.js App Router (inside a client component rendered by the providers):

```tsx
import { usePathname, useSearchParams } from 'next/navigation'

const PageViews = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { page } = useAnalytics()

  useEffect(() => page(), [pathname, searchParams, page])
  return null
}
```

Next.js requires components that call `useSearchParams()` to be rendered inside `<Suspense>`.

`page()` reads `location.href` and `document.title` when it's called, so the title must already be updated. Frameworks
that set the title after navigation may need `page({ page_title: 'Pricing' })`.
