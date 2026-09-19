# Consent

Privacy law in the EEA, the UK and elsewhere requires consent before analytics and advertising storage is used, and
Google has required [Consent Mode v2](https://developers.google.com/tag-platform/security/guides/consent) for EEA and UK
traffic since March 2024. The library carries one consent state and applies it to every destination.

## Starting state

```ts
createAnalytics({ consent: 'denied', /* … */ })
```

`consent` is required: `'denied'` until the visitor chooses (the usual choice where consent is required by law), or
`'granted'` where it isn't. Every purpose starts with that value.

## Recording the visitor's choice

Call `update()` from your consent banner or consent-management platform (CMP):

```ts
analytics.consent.update({ analytics: 'granted', ads: 'denied' })
analytics.consent.get() // { analytics: 'granted', ads: 'denied', adUserData: 'denied', adPersonalization: 'denied' }
```

Purposes you leave out keep their current state. Updates made before `start()` are queued and applied in order with
events, so an event tracked before the visitor chose is sent under the state it was tracked in.

| Purpose | Covers |
| --- | --- |
| `analytics` | analytics storage (cookies, identifiers) |
| `ads` | advertising storage; also sets `adUserData` and `adPersonalization` unless you set those explicitly |
| `adUserData` | sending user data to advertising platforms |
| `adPersonalization` | personalised advertising (remarketing) |

Set `adUserData` and `adPersonalization` separately when your CMP asks for them separately (for example IAB TCF-based
banners):

```ts
analytics.consent.update({ ads: 'granted', adPersonalization: 'denied' })
```

An update with an unknown purpose or a value other than `'granted'`/`'denied'` is ignored and reported to `onError` as
`invalid_consent` (it throws with `debug: true`).

## How it maps to vendors

| Purpose | Google Consent Mode v2 | Meta Pixel |
| --- | --- | --- |
| `analytics` | `analytics_storage` | — |
| `ads` | `ad_storage` (and `ad_user_data`, `ad_personalization` when not set separately) | through `adUserData` |
| `adUserData` | `ad_user_data` | `fbq('consent', 'grant' \| 'revoke')` |
| `adPersonalization` | `ad_personalization` | — |

For the Meta Pixel, a denied starting state queues `fbq('consent', 'revoke')` before `init`; Meta then holds the Pixel
until consent is granted.

For GA4 and Google Tag Manager, `start()` sends `gtag('consent', 'default', …)` before anything else, and every
`update()` sends `gtag('consent', 'update', …)`. When a signal starts denied, the default includes `wait_for_update`
(500 ms, or `waitForUpdate` on the `ga4` / `gtm` options) so tags wait briefly for the banner's answer.

If your CMP also writes Consent Mode itself (for example through a Tag Manager template), keep one source of truth:
pass the CMP's decision to `analytics.consent.update()`, and don't let two systems set different defaults.

## Global Privacy Control

Browsers and extensions that support [Global Privacy Control](https://globalprivacycontrol.org/) send a "do not sell or
share my data" signal, which laws such as California's CCPA/CPRA recognise as an opt-out. When it's present, the
advertising purposes (`ads`, `adUserData`, `adPersonalization`) start `denied` even if `consent` is `'granted'`.
`analytics` is unaffected. An explicit `consent.update()` after the visitor makes a choice still wins.

To handle GPC yourself instead, set `respectGpc: false`. Browsers without GPC support simply don't send the signal.

## Server rendering

`consent.update()` does nothing on the server. One instance serves every request there, so a single visitor's choice
must never change it. Record consent in the browser.
