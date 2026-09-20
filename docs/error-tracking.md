# Error tracking with Google Analytics 4

Google Analytics 4 has a recommended event for errors, called `exception`, with two standard details: `description`
(what went wrong) and `fatal` (whether it stopped the visitor). Nothing sends it for you on the web, so you track it
like any other event.

**What this gives you:** how often errors happen, on which pages, browsers and countries, and what those visitors did
before and after, next to the rest of your funnel. Because it's an ordinary event, you can compare "saw an error" with
"completed checkout".

**What it doesn't give you:** stack traces, grouping of similar errors, source maps, or alerts. A dedicated error
tracker such as Sentry still does that job better. Use Google Analytics for *how much this costs you*, and an error
tracker for *what exactly broke*.

## Send an error

```ts
// error-tracking.ts
import { analytics } from './analytics'

// Errors can repeat in a loop, so cap them per page load.
const MAX_PER_PAGE = 10
let sent = 0

export const trackError = (description: string, fatal = false) => {
  if (sent >= MAX_PER_PAGE) return
  sent += 1

  analytics.track(
    'exception',
    // Google Analytics keeps the first 100 characters of a text value.
    { description: description.slice(0, 100), fatal },
    // Errors are useless to advertising platforms, so keep them out of Meta.
    { meta: false },
  )
}
```

Keep descriptions **short and repeatable**, such as `checkout: card_declined`, rather than raw messages. Repeatable
labels group in reports; raw messages differ every time, and they often contain things you shouldn't send, like an
email address or an order ID in a URL. The library removes email addresses it recognises, but it can't catch
everything, so decide what goes in the description yourself.

## Catch errors the browser reports

```ts
// somewhere that runs once in the browser
import { trackError } from './error-tracking'

window.addEventListener('error', event => {
  trackError(`${event.message} (${event.filename}:${event.lineno})`, true)
})

window.addEventListener('unhandledrejection', event => {
  trackError(`unhandled promise: ${String(event.reason)}`)
})
```

## Catch React render errors

In Next.js, `error.tsx` already receives the error. Track it and show your message:

```tsx
// app/error.tsx
'use client'

import { useEffect } from 'react'
import { trackError } from '../error-tracking'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    trackError(`render: ${error.message}`, true)
  }, [error])

  return (
    <div>
      <p>Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

Without Next.js, an error boundary does the same:

```tsx
// ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { trackError } from './error-tracking'

export class ErrorBoundary extends Component<{ children: ReactNode }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackError(`render: ${error.message} in ${info.componentStack?.split('\n')[1]?.trim()}`, true)
  }

  render() {
    return this.state.failed ? <p>Something went wrong.</p> : this.props.children
  }
}
```

## Track errors that aren't crashes

The useful ones are often not exceptions at all: a payment declined, a form rejected, an upload too large. Those
deserve their own event names, so they can be counted and funnelled separately:

```ts
analytics.track('payment_failed', { reason: 'card_declined', step: 'checkout' }, { meta: false })
```

## Problems the library itself reports

`onError` receives the library's own complaints, such as an event name that breaks a Google Analytics rule. Don't send
those back through `track()`: if tracking is broken, the report is likely to break too, and you can end up in a loop.
Log them, or pass them to your error tracker:

```ts
createAnalytics({
  consent: 'denied',
  debug: process.env.NODE_ENV !== 'production', // throws in development so mistakes are obvious
  onError: error => myErrorTracker.captureException(error),
  ga4: { measurementId: 'G-XXXXXXX' },
})
```

See [Errors](./tracking-events.md#errors) for every code it can report.

## Seeing the errors in Google Analytics

Exception events appear in **Reports → Engagement → Events** as `exception`. To break them down by what went wrong,
register `description` as an event-scoped custom dimension in **Admin → Custom definitions**; it then becomes available
in reports and explorations. Custom dimensions only apply from the moment you create them, so add it before you start
sending errors in earnest.
