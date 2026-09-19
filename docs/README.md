# React Marketing Tools docs

Try the library first in the [playground](https://bronz3beard.github.io/react-marketing-tools/): it shows what each
vendor receives for every event, without sending anything.

## Start here

- [Getting started](./getting-started.md): install, create an instance, track your first event
- [React](./react.md): the provider and hook, Next.js App Router, page views in single-page apps, journeys
- [Configuration](./configuration.md): every `createAnalytics()` option
- [Tracking events](./tracking-events.md): naming rules, page views, journeys, click autocapture, users, personal data,
  errors

## Consent and identity

- [Consent](./consent.md): Consent Mode v2, how purposes map to vendors, Global Privacy Control
- [Attribution](./attribution-utm.md): UTM params and ad click IDs
- [Visitor ID](./visitor-id.md): a stable ID for a consenting visitor, random or fingerprint

## Destinations

- [Google Tag Manager](./google-tag-manager.md): what reaches the dataLayer and how to use it in GTM
- [Google Analytics 4](./google-analytics-4.md): events, user IDs and page views through gtag.js
- [Meta Pixel](./meta-pixel.md): standard events, consent and advanced matching

## Server

- [Server-side tagging](./server-side-tagging.md): send hits through your own domain
- [GA4 Measurement Protocol](./measurement-protocol.md): GA4 events from your server
- [Meta Conversions API](./meta-conversions-api.md): Meta events from your server, and relaying the Pixel's events

## Help

- [Debugging](./debugging.md): see what's sent, and fix common problems
- [Migrating from 0.4](./migration-v1.md): the 1.0 equivalent of every 0.4 API
- [Changelog](./CHANGELOG.md)

## Maintainers

- [Releasing](./releasing.md): publishing a new version to npm
