# Migrating from 0.4

1.0 replaces the 0.4 API rather than extending it. Most apps need fewer lines afterwards: one instance, one provider and
`track(name, params)`.

## Setup

0.4:

```js
buildConfig({
  appName: 'my-app',
  appSessionCookieName: 'APP_SESSION',
  eventActionPrefix: { … },
  globalEventActionList: { … },
  includeUserKeys: ['firstName', 'lastName'],
  TOKENS: { GA4_PUBLIC_API_SECRET: '…', GA4_PUBLIC_MEASUREMENT_ID: 'G-…', IP_INFO_TOKEN: '…' },
  withDeviceInfo: true,
  withServerLocationInfo: false,
})

<ReactMarketingProvider>
  <App />
</ReactMarketingProvider>
```

1.0:

```tsx
export const analytics = createAnalytics({
  consent: 'denied', // until your consent banner records the visitor's choice
  gtm: { containerId: 'GTM-XXXXXXX' },
  ga4: { measurementId: 'G-XXXXXXX' },
})

<AnalyticsProvider analytics={analytics}>
  <App />
</AnalyticsProvider>
```

## Tracking an event

0.4:

```js
const { trackAnalyticsEvent } = useMarketingApi()
const { analyticsPlatform, eventActionPrefixList, analyticsGlobalEventActionList } = useMarketingState()

await trackAnalyticsEvent({
  data: { count },
  eventNameInfo: {
    eventName: 'count button click',
    actionPrefix: eventActionPrefixList.INTERACTION,
    globalAppEvent: analyticsGlobalEventActionList.AUTHENTICATED,
  },
  analyticsType: analyticsPlatform.DATALAYER_PUSH,
  dataLayerCheck: false,
  userDataKeysToHashArray: null,
})
```

1.0:

```ts
const { track } = useAnalytics()

track('count_button_click', { count })
```

The event reaches every configured destination, so there's no `analyticsType` to choose.

## API map

| 0.4 | 1.0 |
| --- | --- |
| `buildConfig(options)` | `createAnalytics(config)`, which returns the instance |
| `<ReactMarketingProvider>` | `<AnalyticsProvider analytics={analytics}>` |
| `useMarketingApi()`, `useMarketingState()` | `useAnalytics()` |
| `trackAnalyticsEvent({ data, eventNameInfo, analyticsType })` | `track(name, params)` |
| `analyticsType: analyticsPlatform.DATALAYER_PUSH` | the `gtm` option |
| `analyticsType: analyticsPlatform.GOOGLE` | the `ga4` option (through gtag.js) |
| `eventActionPrefix`, `globalEventActionList`, `eventNameInfo` (`J_…`, `I_…` names) | plain GA4 event names (`sign_up`, `purchase`, your own `snake_case`); multi-step flows with [`journey()`](./tracking-events.md#journeys) |
| `includeUserKeys`, `userDataKeysToHashArray` | `identify(userId, { email, phone, firstName, lastName })`: traits go only to destinations that match users, hashed by the vendor or your server |
| `TOKENS.GA4_PUBLIC_API_SECRET`, `TOKENS.GA4_PUBLIC_MEASUREMENT_ID` | `ga4.measurementId` in the browser; the API secret only on your server, with [`sendMeasurementProtocolEvent()`](./measurement-protocol.md) |
| `appSessionCookieName` (GA4 `client_id` from your own cookie) | gtag.js manages the client ID; on the server, [`readGa4Cookies()`](./measurement-protocol.md#sending-an-event) reads it |
| `consoleLogData`, `showMissingUserAttributesInConsole`, `showMeBuildIn…()` | `debug: true` and `onError` (see [Debugging](./debugging.md)) |
| `dataLayerCheck` | not needed: the library creates the dataLayer |
| `ContextState`, `ContextApi` | not exported; use `useAnalytics()` |

## Removed

| 0.4 feature | Why |
| --- | --- |
| `withServerLocationInfo`, `IP_INFO_TOKEN` (ipinfo.io lookups) | GA4 and Meta work out location themselves, and the lookup put a third-party token in the browser |
| `withDeviceInfo` (`device-detector-js`) | GA4 and Meta collect device details themselves; removing it took the bundle from 189 kB to a few kB |
| Sending GA4 events from the browser with the Measurement Protocol | it exposed the API secret; the browser now uses gtag.js, and the Measurement Protocol runs on your server |
| The UMD build and CommonJS entry | 1.0 is ESM-only; every current bundler and Node.js 22.12+ load it |

## New in 1.0

Things 0.4 didn't have: the [Meta Pixel](./meta-pixel.md) and the
[Conversions API relay](./meta-conversions-api.md#relaying-the-pixels-events), [Consent Mode v2](./consent.md),
[UTM and click-ID attribution](./attribution-utm.md), a [visitor ID](./visitor-id.md),
[journeys and click autocapture](./tracking-events.md#journeys), personal-data redaction, and the
[server helpers](./server-side-tagging.md). See the [changelog](./CHANGELOG.md) for the full list.
