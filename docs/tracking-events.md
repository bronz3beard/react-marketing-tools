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

## Page views

`page()` sends a `page_view` event with the current `page_location` and `page_title`. Params you pass are added:

```ts
analytics.page({ page_type: 'pricing' })
```

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
| `destination_failed` | a vendor script threw | other destinations still receive the event |

With `debug: true`, every problem except `destination_failed` throws at the call site instead, so it shows up in
development:

```ts
createAnalytics({
  consent: 'granted',
  debug: import.meta.env.DEV,
  onError: error => reportToMonitoring(error),
})
```
