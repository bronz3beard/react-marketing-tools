# Debugging

## Turn on debug mode in development

```ts
createAnalytics({
  consent: 'granted',
  debug: import.meta.env.DEV, // or process.env.NODE_ENV !== 'production'
  onError: error => reportToYourErrorTracker(error),
})
```

With `debug: true`, mistakes such as an invalid event name, personal data in params, or an email address as a user ID
throw where you made them. In production they go to `onError` (by default `console.error`) with a `code`, and the app
keeps running. See [Errors](./tracking-events.md#errors) for every code.

## See what each vendor receives

- **The [playground](https://bronz3beard.github.io/react-marketing-tools/)** shows the exact calls for every event,
  without sending anything.
- **In your app**, type `dataLayer` in the browser console: it lists the Tag Manager pushes (objects with `event`) and the
  gtag.js calls (`Arguments` lists such as `['event', 'sign_up', {…}]`).
- **Google Tag Manager**: use Preview mode. Each event appears with its params and `event_id`.
- **Google Analytics 4**: connect your site in [Tag Assistant](https://tagassistant.google.com/), then open **Admin →
  DebugView** in GA4. The **Realtime** report shows events from every visitor.
- **Meta Pixel**: in Events Manager, open your dataset and choose **Test events**, or install the Meta Pixel Helper
  browser extension.
- **Conversions API relay**: pass `testEventCode` in `createTrackHandler({ meta })` to see relayed events under **Test
  events**. In the browser's Network panel, the relay's request to your endpoint shows up as a `ping` (a beacon).
- **Measurement Protocol**: send with `validate: true` to get GA4's validation messages.

## Common problems

| What you see | Likely cause | What to do |
| --- | --- | --- |
| Nothing is sent at all | `start()` never ran | Wrap the app in `<AnalyticsProvider>`, or call `analytics.start()` without React. Calls before `start()` are queued, not lost. |
| Nothing is sent during server rendering | expected | `start()` and `track()` do nothing on the server; events go out once the page runs in the browser. |
| Events are in the dataLayer, but GA4 shows few | analytics consent is denied | Google tags then send cookieless pings, which GA4 models rather than reports one by one. Check `analytics.consent.get()`. |
| Meta events are missing | `adUserData` consent is denied, or an ad blocker stopped the Pixel | Consent: the Pixel holds events until it's granted. Blockers: add the [relay](./meta-conversions-api.md#relaying-the-pixels-events). |
| An event never arrives, with `invalid_event` in the console | the name breaks a GA4 rule | Letters, digits and underscores, starting with a letter, at most 40 characters. See [Naming events](./tracking-events.md#naming-events). |
| A param value is `[redacted]` | it looked like personal data | Send personal data with `identify()` instead. See [Personal data](./tracking-events.md#personal-data). |
| Page views are counted twice | both the vendor's automatic page views and `page()` | Choose one: `pageViews: 'manual'` on `ga4` and `metaPixel`, or stop calling `page()`. |
| Events are sent twice in development | `<StrictMode>` runs effects twice | Expected in development only. Events tracked in event handlers are never duplicated. |
| Vendor scripts are blocked by the Content Security Policy | the scripts need a nonce, or their domains aren't allowed | Pass your nonce as `nonce`. Allow Google's domains as in [Google's CSP guide](https://developers.google.com/tag-platform/security/guides/csp), and `connect.facebook.net` (script) and `www.facebook.com` (requests) for the Meta Pixel. |
| The relay answers 403 | the page's origin isn't in `allowedOrigins`, or the page sends `Origin: null` | Add the exact origin (`https://shop.example.com`, no trailing slash). `Referrer-Policy: no-referrer` makes browsers send `null`. |
| The relay answers 502 | Meta rejected the event, or couldn't be reached | The handler's `onError` logs Meta's error, for example an expired access token. |
| `getVisitorId()` never resolves | `start()` never ran | See the first row. |
