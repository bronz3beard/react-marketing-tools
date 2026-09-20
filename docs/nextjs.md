# Next.js (App Router)

A complete setup for Next.js 16's App Router: where each file goes, what runs in the browser, and what runs on your
server. Everything here also works in Next.js 15.

The library has two entry points that matter here:

- `react-marketing-tools` is for the browser. It's marked as client code, so it can only be imported from files that
  start with `'use client'`.
- `react-marketing-tools/server` is for your server: route handlers, server actions and webhooks. It never touches the
  browser.

## The files

```
app/
  analytics.ts           the instance, shared by every client component
  providers.tsx          wraps the app and starts tracking
  page-views.tsx         sends a page view on every client-side navigation
  layout.tsx             your root layout (runs on the server)
  page.tsx               a page (runs on the server)
  actions.ts             a server action that records a conversion
  api/track/route.ts     the endpoint the Pixel relay posts to
components/
  sign-up-button.tsx     a client component that tracks a click
```

## The instance

```ts
// app/analytics.ts
'use client'

import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  consent: 'denied', // until your consent banner answers
  gtm: { containerId: process.env.NEXT_PUBLIC_GTM_ID! },
  ga4: {
    measurementId: process.env.NEXT_PUBLIC_GA4_ID!,
    // Next.js navigates without reloading, so page views are sent by the component below.
    pageViews: 'manual',
  },
  metaPixel: { pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID!, pageViews: 'manual' },
})
```

IDs that the browser needs must start with `NEXT_PUBLIC_`, which is how Next.js marks values it's allowed to include
in the page. Secrets for the server, further down, must **not** have that prefix.

## The provider

```tsx
// app/providers.tsx
'use client'

import { Suspense, type ReactNode } from 'react'
import { AnalyticsProvider } from 'react-marketing-tools'
import { analytics } from './analytics'
import { PageViews } from './page-views'

export const Providers = ({ children }: { children: ReactNode }) => (
  <AnalyticsProvider analytics={analytics}>
    {/* useSearchParams() needs a Suspense boundary, so the rest of the page can still be prerendered. */}
    <Suspense fallback={null}>
      <PageViews />
    </Suspense>
    {children}
  </AnalyticsProvider>
)
```

```tsx
// app/page-views.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useAnalytics } from 'react-marketing-tools'

export const PageViews = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { page } = useAnalytics()

  useEffect(() => {
    page()
  }, [pathname, searchParams, page])

  return null
}
```

## The layout (server)

The root layout stays a server component. It renders the provider around your app:

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'
import { Providers } from './providers'

export const metadata = { title: 'Shop' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Tracking from a component

Pages stay server components. Anything that tracks a click is a small client component:

```tsx
// components/sign-up-button.tsx
'use client'

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

```tsx
// app/page.tsx  (a server component)
import { SignUpButton } from '../components/sign-up-button'

export default function Page() {
  return (
    <main>
      <h1>Welcome</h1>
      <SignUpButton />
    </main>
  )
}
```

With `autocapture: { clicks: true }` in the instance, a server component can mark elements itself and send events with
no client component at all:

```tsx
// app/pricing/page.tsx  (a server component)
export default function PricingPage() {
  return (
    <button data-analytics-event="cta_click" data-analytics-param-location="pricing_header">
      Start free trial
    </button>
  )
}
```

## Sending events from the server

### A server action

Server actions run on your server, so they can use secrets and send events even if the visitor's browser blocks
tracking. Read the visitor's Google Analytics cookies from the request so the event joins their session:

```ts
// app/actions.ts
'use server'

import { headers } from 'next/headers'
import {
  readGa4Cookies,
  sendMeasurementProtocolEvent,
} from 'react-marketing-tools/server'

export const subscribe = async (formData: FormData) => {
  const measurementId = process.env.NEXT_PUBLIC_GA4_ID!
  const { clientId, sessionId } = readGa4Cookies({
    cookieHeader: (await headers()).get('cookie') ?? '',
    measurementId,
  })
  if (!clientId) return // no Google Analytics cookie: nothing to attach the event to

  await sendMeasurementProtocolEvent({
    measurementId,
    apiSecret: process.env.GA4_API_SECRET!,
    clientId,
    sessionId,
    events: [
      { name: 'generate_lead', params: { plan: String(formData.get('plan')) } },
    ],
  })
}
```

`headers()` and `cookies()` are asynchronous in Next.js 15 and later, so both need `await`.

### A webhook

```ts
// app/api/stripe/route.ts
import { sendMeasurementProtocolEvent } from 'react-marketing-tools/server'

export async function POST(request: Request) {
  const order = await request.json() // your payment provider's payload, verified first

  await sendMeasurementProtocolEvent({
    measurementId: process.env.NEXT_PUBLIC_GA4_ID!,
    apiSecret: process.env.GA4_API_SECRET!,
    // Saved with the order when the visitor started checkout, using readGa4Cookies().
    clientId: order.ga4ClientId,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: order.id,
          value: order.total,
          currency: 'USD',
        },
      },
    ],
  })

  return new Response(null, { status: 204 })
}
```

### The relay endpoint

Add `server: { endpoint: '/api/track' }` to the instance, then mount the handler. Every event the Meta Pixel receives
is then sent from your server as well, and Meta counts each one once:

```ts
// app/api/track/route.ts
import { createTrackHandler } from 'react-marketing-tools/server'

export const POST = createTrackHandler({
  allowedOrigins: ['https://shop.example.com'],
  meta: {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID!,
    accessToken: process.env.META_CAPI_TOKEN!,
  },
})
```

`createTrackHandler()` checks its settings immediately, and Next.js loads this file while it builds your app. That's
useful — a missing or misspelled setting fails the build instead of the first visitor — but it means the access token
has to exist at build time. If your builds don't have it, create the handler inside the request instead:

```ts
// app/api/track/route.ts
import { createTrackHandler } from 'react-marketing-tools/server'

export async function POST(request: Request) {
  const handle = createTrackHandler({
    allowedOrigins: ['https://shop.example.com'],
    meta: {
      pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID!,
      accessToken: process.env.META_CAPI_TOKEN!,
    },
  })

  return handle(request)
}
```

## Important: your settings are checked while Next.js builds

> **`createTrackHandler()` checks its settings the moment the file is loaded, and Next.js loads route files while it
> builds your app. If your build doesn't have `META_CAPI_TOKEN`, the build fails — not the first request.**

This catches a missing or misspelled setting before anything is deployed, which is usually what you want. It surprises
people whose build and runtime have different environment variables, which is common in Docker images and in CI that
builds before secrets are injected.

You have two choices:

1. **Give the build the token.** On Vercel, environment variables are available during the build, so this works by
   default. Elsewhere, pass it to the build step as well as the runtime.
2. **Create the handler inside the request**, as shown above. The check then happens on the first event instead, and
   the build needs no secrets.

The same applies to anything else you create at the top of a route file, including `createAnalytics()` if you ever call
it there.

## Things to watch for

| | |
| --- | --- |
| "You're importing a component that needs `useAnalytics`…" | The file that calls the hook needs `'use client'` at the top. |
| Importing the library in a server component | Use `react-marketing-tools/server` for server code. `react-marketing-tools` is client-only. |
| Page views counted twice | Either keep `pageViews: 'manual'` and the component above, or leave the vendors' automatic page views on and don't call `page()`. |
| Events tracked twice in development | React's Strict Mode runs effects twice during development only. |
| `useSearchParams() should be wrapped in a suspense boundary` | Keep the `<Suspense>` around `<PageViews />` as shown. |
| The build fails with `meta.accessToken is required` | Next.js loads route files while building. Either give the build the secret, or create the handler inside the request as shown above. |
