# Tracking events

```ts
analytics.track('sign_up', { method: 'google' }) // an action
analytics.page() // a page view
analytics.identify('user-42', { email: 'a@b.com' }) // after login
analytics.reset() // after logout
```

All four are queued until `start()` and sent in the order they were called. They do nothing on the server.

## Naming events

Use Google Analytics 4 [recommended event names](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
where one fits (`sign_up`, `login`, `purchase`, `generate_lead`, `search`…), because GA4 builds reports on them. Otherwise
use your own `snake_case` name.

Every event name and param name is checked against GA4's limits:

| Rule | Limit |
| --- | --- |
| Event and param names | start with a letter; letters, digits and underscores only; at most 40 characters |
| Reserved prefixes | names can't start with `google_`, `ga_` or `firebase_` |
| Params per event | at most 25 |
| String param values | at most 100 characters (`page_location` 1000, `page_title` 300, `page_referrer` 420) |

An event with an invalid **name** is dropped, because GA4 would discard it anyway. **Param** problems are reported, but
the event is still sent, because GA4 truncates long values and ignores extra params itself.

## Personal data

Analytics tools prohibit personal data in event params. Before an event leaves the page, the library:

- replaces the whole value of any param whose name contains `email`, `phone`, `first_name`, `last_name`, `address` or
  `password` with `"[redacted]"` (strings and numbers only, so `email_opt_in: true` is kept)
- replaces email addresses found inside any string value, including URL-encoded ones in `page_location`, with `[redacted]`

Only top-level params are checked; nested values such as ecommerce `items` are sent unchanged.

To use personal data for matching users (for example Meta's advanced matching), pass it to `identify()` as traits. Traits
go only to destinations that match users with them, and never into event params or the dataLayer.

## Per-destination options

`track()` takes an optional third argument for vendor-specific adjustments. Today it supports the Meta Pixel and the
relay:

```ts
analytics.track('lead_form', { form: 'demo' }, { meta: { event: 'Lead', params: { content_category: 'b2b' } } })
analytics.track('video_progress', { percent: 50 }, { meta: false }) // GA4 and Tag Manager only
```

See [Meta Pixel](./meta-pixel.md#choosing-the-meta-event-yourself).

## Page views

`page()` sends a `page_view` event with the current `page_location` and `page_title`. Params you pass are added:

```ts
analytics.page({ page_type: 'pricing' })
```

## Journeys

A journey tracks a multi-step flow, such as a checkout or a sign-up, as a sequence of events you can build a funnel
from:

```ts
const checkout = analytics.journey('checkout')

checkout.step('shipping')
checkout.step('payment', { method: 'card' })
checkout.complete({ value: 42, currency: 'USD' }) // or checkout.abandon('timeout')
```

| Call | Event | Params |
| --- | --- | --- |
| the journey's first call | `journey_start` | `journey_id`, `journey_name` |
| `step(name, params?)` | `journey_step` | your params, `journey_id`, `journey_name`, `step_name`, `step_index` (1 for the first step) |
| `complete(params?)` | `journey_complete` | your params, `journey_id`, `journey_name`, `step_count` |
| `abandon(reason?)` | `journey_abandon` | `journey_id`, `journey_name`, `step_count`, the last `step_name`, `reason` |

- Each journey gets its own `journey_id`, so create one per flow, not on every render (see
  [React](./react.md#journeys)). Creating one sends nothing; `journey_start` goes out with its first call.
- After `complete()` or `abandon()`, the journey has ended: further calls send nothing and are reported as
  `journey_ended` (they throw with `debug: true`).
- A journey lives in memory, so it spans client-side navigation but not a full page load.
- Journey events are ordinary events: they reach every destination, including the Meta Pixel as custom events.

To see the funnel in GA4, register `journey_name` and `step_name` as event-scoped custom dimensions (**Admin → Custom
definitions**), then build a funnel exploration (**Explore → Funnel exploration**) with a step for `journey_start` and
one per `journey_step`, each filtered on those dimensions, and a final `journey_complete` step.

## Click autocapture

Turn it on, then mark the elements whose clicks you want tracked:

```ts
createAnalytics({ consent: 'granted', ga4: { measurementId: 'G-XXXXXXX' }, autocapture: { clicks: true } })
```

```html
<button data-analytics-event="cta_click" data-analytics-param-location="hero" data-analytics-param-button-text="Start">
  Start
</button>
```

A click anywhere inside the button sends `track('cta_click', { location: 'hero', button_text: 'Start' })`.

- `data-analytics-param-*` attributes become params, with dashes turned into underscores. Values are strings; use
  `track()` for numbers such as `value`.
- The nearest marked element around the click wins, and elements added later are covered too.
- One listener on the document, added by `start()`, handles every click. It listens in the capture phase, so a handler
  that calls `stopPropagation()` doesn't hide the click.
- The events go through the same checks as `track()`, including personal-data redaction.

## Web Vitals

Report [Core Web Vitals](https://web.dev/articles/vitals) (LCP, INP and CLS) from real visitors, using Google's
`web-vitals` library:

```sh
npm install web-vitals@^6
```

```ts
import { trackWebVitals } from 'react-marketing-tools/web-vitals'

void trackWebVitals(analytics) // or, in React: useEffect(() => void trackWebVitals(analytics), [analytics])
```

Each metric is sent as an event named after it (`LCP`, `INP`, `CLS`), with the params the `web-vitals` library
recommends for GA4:

| Param | Value |
| --- | --- |
| `value` | the change since the metric's last report (`delta`), so reports of one metric add up |
| `metric_id` | the same for every report of one metric on one page load |
| `metric_value` | the metric's current value (milliseconds; CLS has no unit) |
| `metric_delta` | the change since the last report |
| `metric_rating` | `good`, `needs-improvement` or `poor` |
| `page_location` | the page the metric was measured on, when it was reported after a client-side navigation |

- The events reach GA4 and Tag Manager, but never the Meta Pixel or the relay.
- `web-vitals` is downloaded when you first call `trackWebVitals()`. Calling it again for the same instance, for example
  from `<StrictMode>`'s second effect run, does nothing.
- It does nothing on the server.

GA4's standard reports don't chart metric distributions. Register `metric_rating` as an event-scoped custom dimension
to break the events down by rating, or use the BigQuery export for percentiles (see
[Measure and debug performance with Google Analytics 4 and BigQuery](https://web.dev/articles/vitals-ga4)).

## Users

```ts
analytics.identify('user-42', { email, phone, firstName, lastName })
```

The user id must be your own stable identifier. Email addresses are refused as user ids, because they're personal data.
Call `reset()` on logout so later events aren't linked to the previous user.

## Errors

The library never lets an analytics problem break your app. Problems are passed to `onError` (by default
`console.error`) as an `AnalyticsError` with a `code`:

| Code | Cause | Production behaviour |
| --- | --- | --- |
| `invalid_event` | event name breaks a GA4 rule | event dropped |
| `invalid_param` | param breaks a GA4 limit | event sent |
| `pii_redacted` | personal data was removed | redacted event sent |
| `invalid_user_id` | `identify()` got an empty or email user id | identify ignored |
| `invalid_consent` | `consent.update()` got an unknown purpose or value | update ignored |
| `destination_failed` | a vendor script threw, or the relay couldn't reach your endpoint | other destinations still receive the event |
| `visitor_id_failed` | the `visitorId.fingerprint` function failed | no visitor ID for this page load |
| `journey_ended` | a journey was used after `complete()` or `abandon()` | call ignored |

With `debug: true`, every problem except `destination_failed` and `visitor_id_failed` throws at the call site instead,
so it shows up in development:

```ts
createAnalytics({
  consent: 'granted',
  debug: import.meta.env.DEV,
  onError: error => reportToMonitoring(error),
})
```
