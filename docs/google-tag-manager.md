# Google Tag Manager

```ts
createAnalytics({
  consent: 'granted',
  gtm: { containerId: 'GTM-XXXXXXX' },
})
```

## Loading the container

On `start()` the library does what the official GTM snippet does: it creates `window.dataLayer`, pushes the `gtm.js`
start event and loads `https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX` asynchronously.

If the page already contains the GTM snippet, the library detects it and doesn't load the container or push `gtm.js`
again (doing so would fire your "All Pages" triggers twice). You can also skip loading explicitly:

```ts
gtm: { containerId: 'GTM-XXXXXXX', loadScript: false }
```

With a Content-Security-Policy, pass your nonce as the top-level `nonce` option and follow Google's
[CSP guide for Tag Manager](https://developers.google.com/tag-platform/security/guides/csp).

## What reaches the dataLayer

```ts
analytics.track('sign_up', { method: 'google' })
```

pushes:

```js
{ method: 'google', event: 'sign_up', event_id: '6f1c…' }
```

- `event` is the name passed to `track()`, and `event_id` is the event's UUID. Params can't overwrite either key.
- Params are pushed flat, so a Data Layer Variable named `method` reads them directly.

## Using events in GTM

1. **Trigger:** create a *Custom Event* trigger whose event name is `sign_up`.
2. **Variables:** create a *Data Layer Variable* for each param you need (`method`), and one for `event_id`.
3. **Tag:** attach the trigger and map the variables. Use `event_id` wherever a tag accepts an event or deduplication ID.

GTM merges every push into a persistent data model, so a param from an earlier event stays readable by later tags until
another event overwrites it. Read params only in tags fired by the event that sent them.
