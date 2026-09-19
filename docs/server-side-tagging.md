# Server-side tagging

Server-side tagging moves tag processing from the visitor's browser to a server you control. Browser hits go to your own
domain, and your server container forwards them to GA4, Meta and other vendors. That gives you fewer requests to
third-party domains, control over what each vendor receives, and resilience against blockers.

## Choosing a setup

| Setup | What you run | When it fits |
| --- | --- | --- |
| [Google tag gateway for advertisers](https://developers.google.com/tag-platform/tag-manager/server-side/dependency-serving) | nothing new: Google tags are served through your CDN or load balancer | You only need Google tags served first-party, without running a container |
| [Server-side Google Tag Manager](https://developers.google.com/tag-platform/tag-manager/server-side) | a server container (Google recommends Cloud Run; managed hosts also exist) | You want to transform data or forward events to several vendors from your server |
| [GA4 Measurement Protocol](./measurement-protocol.md) and [Meta Conversions API](./meta-conversions-api.md) | a function call in your own server code (`react-marketing-tools/server`) | Events happen on your server, such as a purchase confirmed by a payment webhook, or you want Meta to receive events the browser Pixel misses |

## Sending GA4 hits to a server container

```ts
createAnalytics({
  consent: 'granted',
  ga4: {
    measurementId: 'G-XXXXXXX',
    serverContainerUrl: 'https://sgtm.example.com',
  },
})
```

The GA4 config is sent with `server_container_url`, so gtag.js delivers hits to your container, where the GA4 client
receives them. With a server container, every GA4 event also carries `event_id`, the same ID every other destination
gets for that event. Map it in server-side tags that deduplicate, such as a Meta Conversions API tag, so a purchase seen
by both the browser pixel and the server is counted once.

## Serving the Tag Manager container from your domain

```ts
createAnalytics({
  consent: 'granted',
  gtm: {
    containerId: 'GTM-XXXXXXX',
    scriptUrl: 'https://sgtm.example.com/gtm.js',
  },
})
```

The web container loads from `https://sgtm.example.com/gtm.js?id=GTM-XXXXXXX` instead of `googletagmanager.com`. Your
server container must be configured to serve it (for example with a *Web Container* client).

Both URLs must use `https://`. The library throws when the instance is created if they don't.
