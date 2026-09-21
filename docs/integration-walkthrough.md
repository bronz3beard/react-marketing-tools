# Adding this to an existing app

A walkthrough for putting the library into a real project and proving events actually arrive. Work through it in
order; each step is small, and you can stop after step 6 with something genuinely useful running.

If you haven't set up any analytics accounts yet, start with
[what you need first](./getting-started.md#what-you-need-first).

## 1. Install

```sh
npm install react-marketing-tools@next
```

The `@next` matters while 1.0 is in beta: a plain install still gives you the old 0.4 version.

If the project already uses `react-ga4`, `react-gtm-module`, or hand-written `gtag`/`fbq` snippets, leave them in place
for now. Remove them in step 7, once you can see this library's events arriving. Running both briefly only means
duplicate events in a report, which is easier to explain than a silent gap.

## 2. Pick one action to measure

Not everything at once. Choose the single action you'd most regret not measuring: a sign-up, a purchase, a demo
request. You'll have it working end to end in a few minutes, and everything after that is repetition.

## 3. Create the instance

```ts
// analytics.ts
import { createAnalytics } from 'react-marketing-tools'

export const analytics = createAnalytics({
  consent: 'denied', // until your banner records a choice; see step 7
  gtm: { containerId: 'GTM-XXXXXXX' },
})
```

Start with the services you already have. Adding GA4 and the Meta Pixel later is one line each. Creating the instance
does nothing on its own: no script loads and no cookie is written until step 4 starts it.

## 4. Provide it to the app

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

Next.js App Router needs a slightly different shape, because the provider has to be a client component: see
[Next.js](./nextjs.md). Other routers are in [React](./react.md).

## 5. Track the action

```tsx
import { useAnalytics } from 'react-marketing-tools'

export const SignUpButton = () => {
  const { track } = useAnalytics()

  return <button onClick={() => track('sign_up', { method: 'google' })}>Sign up</button>
}
```

## 6. Prove it arrived

This is the step people skip, and it's the one that saves days. Do them in order; stop at the first that fails.

| Where | What to do | What you should see |
| --- | --- | --- |
| Browser console | Type `dataLayer` | Your event, with its parameters and an `event_id` |
| The playground | Open the [playground](https://bronz3beard.github.io/react-marketing-tools/) and press the same event | The same shape of call, so you can compare against a known-good one |
| Tag Manager | Preview mode (Tag Assistant), then click your button | The event in the left column, with your parameters |
| GA4 | Connect Tag Assistant, then **Admin → DebugView**; or **Reports → Realtime** | The event within a minute or two |
| Meta | Events Manager → **Test events**, or the Meta Pixel Helper extension | The mapped event name, for example `CompleteRegistration` for `sign_up` |

Nothing showing up? Work through the table in [Debugging](./debugging.md#common-problems). The first three causes
(`start()` never ran, consent denied, an ad blocker) account for most of it.

## 7. Wire consent, and remove the old library

Call the library when your banner gets an answer:

```ts
analytics.consent.update({ analytics: 'granted', ads: 'granted' })
```

Until then, everything stays in the `consent: 'denied'` state you configured in step 3. Read
[Consent](./consent.md) for what each purpose controls in Google's and Meta's tags.

Now that your events are arriving, delete the old analytics package and its initialisation code, and check step 6
again. If the old library also loaded the GTM or GA4 script, make sure exactly one of them still does.

## 8. Page views

Client-side navigation doesn't reload the page, so decide once who reports it:

- **Let the vendors do it** (the default): GA4's enhanced measurement and the Meta Pixel both follow history changes.
- **Or do it yourself**: set `pageViews: 'manual'` on `ga4` and `metaPixel`, and call `analytics.page()` on route
  changes. [React](./react.md#page-views-in-single-page-apps) has the snippet for React Router and Next.js.

Choose one. Both at once double-counts every page view.

## 9. Add the rest, one at a time

Check step 6 after each, so you always know which change broke something:

| Want | Read |
| --- | --- |
| Funnels for a multi-step flow | [Journeys](./tracking-events.md#journeys) |
| Track clicks with no code, using HTML attributes | [Click autocapture](./tracking-events.md#click-autocapture) |
| Which campaign brought a visitor | [Attribution](./attribution-utm.md) |
| A stable ID for returning visitors | [Visitor ID](./visitor-id.md) |
| Page speed in your reports | [Web Vitals](./tracking-events.md#web-vitals) |
| Your app's errors in GA4 | [Error tracking](./error-tracking.md) |
| Visits from AI assistants | [Measuring AI activity](./ai-traffic.md) |
| PostHog, Umami, Plausible, your own endpoint | [Other tools](./custom-destinations.md) |

## 10. Server-side, when you're ready

Two separate things, both needing secrets that stay on your server:

- **Events only your server sees** (a payment webhook, a refund): [Measurement Protocol](./measurement-protocol.md) for
  GA4, [Conversions API](./meta-conversions-api.md) for Meta.
- **The relay**, so Meta still receives events when a browser blocks the Pixel:
  [Relaying the Pixel's events](./meta-conversions-api.md#relaying-the-pixels-events).

On Next.js, read [the note about settings being checked while your app builds](./nextjs.md#important-your-settings-are-checked-while-nextjs-builds)
before you deploy.

## Before you go live

| Check | Why |
| --- | --- |
| Consent starts denied and your banner calls `consent.update()` | Nothing should be stored before a visitor chooses |
| Only one library loads each vendor script | Duplicate containers double every number |
| Event names follow GA4's rules and your own convention | Renaming later doesn't fix historical data |
| No personal data in event parameters; use `identify()` instead | The library redacts what it recognises, not everything |
| Server secrets are absent from the browser bundle | Search your built output for the token to be sure |
| `onError` reports somewhere you'll see it | Silent analytics failures stay silent for months |
| Custom dimensions registered in GA4 for parameters you report on | GA4 only collects them from the day you add them |

## Removing it

Delete the provider and the `analytics.ts` file. Nothing else is global: no listeners survive, and the vendor scripts
load only from the provider's `start()`. Stored values live under keys starting with `rmt:` in the browser's storage,
and disappear when a visitor clears site data or withdraws consent.
