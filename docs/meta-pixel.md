# Meta Pixel

```ts
createAnalytics({
  consent: 'denied',
  metaPixel: { pixelId: '1234567890123456' },
})
```

The library loads Meta's official Pixel (`fbevents.js`), initialises your pixel, and sends every event with the same
`eventID` the other destinations receive, so the Pixel and the Conversions API can be deduplicated. To send every Pixel
event through the Conversions API as well, add the [relay](./meta-conversions-api.md#relaying-the-pixels-events).

## Events

`track()` calls use GA4 names. The recommended ones become Meta standard events:

| `track(…)` | Meta event |
| --- | --- |
| `purchase` | `Purchase` |
| `sign_up` | `CompleteRegistration` |
| `generate_lead` | `Lead` |
| `add_to_cart` | `AddToCart` |
| `begin_checkout` | `InitiateCheckout` |
| `view_item` | `ViewContent` |
| `search` | `Search` |
| `add_payment_info` | `AddPaymentInfo` |
| `add_to_wishlist` | `AddToWishlist` |

Any other name is sent as a custom event (`fbq('trackCustom', name, …)`).

Params are converted to Meta's [standard parameters](https://developers.facebook.com/docs/meta-pixel/reference):

- GA4 ecommerce `items` (`[{ item_id, quantity }]`) become `content_ids`, `contents` (`[{ id, quantity }]`),
  `num_items` and `content_type: 'product'`
- `search_term` becomes `search_string`
- `value`, `currency` and everything else pass through

```ts
analytics.track('purchase', {
  value: 42,
  currency: 'USD',
  items: [{ item_id: 'sku1', quantity: 2 }],
})
// → fbq('track', 'Purchase', { value: 42, currency: 'USD', content_ids: ['sku1'],
//      contents: [{ id: 'sku1', quantity: 2 }], num_items: 2, content_type: 'product' }, { eventID: '…' })
```

### Choosing the Meta event yourself

Pass a third argument to send a different Meta event, or to add Meta-only params (merged over the converted ones):

```ts
analytics.track('lead_form', { form: 'demo' }, { meta: { event: 'Lead', params: { content_category: 'b2b' } } })
```

A name that isn't one of Meta's standard events is sent as a custom event. Override params get the same personal-data
redaction as event params.

To keep an event away from Meta altogether (the Pixel and the relay), pass `{ meta: false }`. The other destinations
still receive it:

```ts
analytics.track('video_progress', { percent: 50 }, { meta: false })
```

## Consent

The Pixel follows the `adUserData` consent purpose (which follows `ads` unless you set it separately, see
[Consent](./consent.md)). When it starts denied, `fbq('consent', 'revoke')` is queued before `init`, and Meta holds the
Pixel (including its initialisation) until consent is granted. Every `analytics.consent.update()` sends `grant` or `revoke`.

## Advanced matching

User data given to `identify()` is used for [manual advanced matching](https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching):

| Trait | Pixel parameter |
| --- | --- |
| user id | `external_id` |
| `email` | `em` |
| `phone` | `ph` |
| `firstName` | `fn` |
| `lastName` | `ln` |

Values are passed as they are; the Pixel normalises and SHA-256 hashes them before sending.

**The Pixel only accepts matching data when it initialises.** We tested Meta's current `fbevents.js` (2.9.403): a second
`fbq('init')` for the same pixel doesn't change the stored data, and neither does an empty one. So:

- Call `identify()` **before** `start()` (for example as soon as your app knows the signed-in user on page load). The
  library includes the user in the Pixel's single `init`.
- A sign-in **after** `start()` reaches GTM and GA4 straight away, but the Pixel only picks the user up on the next page
  load. The same applies to `reset()` on sign-out.

The [relay to the Conversions API](./meta-conversions-api.md#relaying-the-pixels-events) sends the user with every event
from your server, so it doesn't have this limit.

## Page views

| `pageViews` | Behaviour |
| --- | --- |
| `'auto'` (default) | The Pixel sends `PageView` on load and on client-side navigation (history changes) itself. `analytics.page()` isn't sent to Meta. |
| `'manual'` | The Pixel's automatic history tracking is turned off (`fbq.disablePushState`), and only `analytics.page()` sends `PageView`, with an `eventID`. |

## Testing

1. In Meta Events Manager, open your dataset and choose **Test events**.
2. Open your site from the test-events page, or install the Meta Pixel Helper browser extension.
3. Track an event and check that it appears with the expected name, parameters and event ID.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `pixelId` | required | Your numeric Pixel (dataset) ID. |
| `pageViews` | `'auto'` | See [Page views](#page-views). |
| `loadScript` | `true` | Set to `false` if the page already includes the Meta Pixel base code. |

If the page already loads `fbevents.js`, the library doesn't load it again but still initialises your pixel, so remove
any `fbq('init')` for the same pixel from the page.
