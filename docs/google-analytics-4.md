# Google Analytics 4

```ts
createAnalytics({
  consent: 'granted',
  ga4: { measurementId: 'G-XXXXXXX' },
})
```

The library loads Google's `gtag.js` and sends events straight to GA4. No API secret is used in the browser.

## What is sent

| Call | gtag command |
| --- | --- |
| `start()` | `gtag('js', …)` and `gtag('config', 'G-XXXXXXX', { … })` |
| `track('purchase', { value: 42, currency: 'USD' })` | `gtag('event', 'purchase', { value: 42, currency: 'USD' })` |
| `identify('user-42')` | `gtag('set', { user_id: 'user-42' })` |
| `reset()` | `gtag('set', { user_id: null })` |
| `page()` | nothing by default; see [Page views](#page-views) |

Event names and params are checked against GA4's limits, and personal data is redacted before sending. See
[Tracking events](./tracking-events.md). Use GA4's
[recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events) (`purchase`,
`sign_up`, `generate_lead`…) where one fits; GA4 builds reports on them.

## Page views

| `pageViews` | Behaviour |
| --- | --- |
| `'auto'` (default) | GA4 records page views itself: one when the page loads and, if *Enhanced measurement → Page changes based on browser history events* is on for your web stream, one on every client-side navigation. `analytics.page()` isn't sent to GA4. |
| `'manual'` | The config is sent with `send_page_view: false`, and only `analytics.page()` sends page views. **Turn off** *Page changes based on browser history events* in the stream settings, or single-page apps count every navigation twice. |

## A page that already has gtag.js

If `window.gtag` already exists, the library uses it and doesn't load `gtag.js` again. It still sends `gtag('config')`
for your measurement ID, so remove any `gtag('config', 'G-XXXXXXX')` for the same ID from the page, or page views are
counted twice. To keep your own script tag but let the library send everything else, set `loadScript: false`.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `measurementId` | required | Your web stream's measurement ID, `G-XXXXXXX`. |
| `pageViews` | `'auto'` | See [Page views](#page-views). |
| `loadScript` | `true` | Set to `false` if the page already loads `gtag.js`. |
| `serverContainerUrl` | none | Send hits to your server-side Tag Manager container. See [Server-side tagging](./server-side-tagging.md). |

GA4 and Google Tag Manager can be used together; they share the page's `dataLayer`.
