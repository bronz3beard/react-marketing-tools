# Measuring AI activity

"AI traffic" covers four different things. Three are worth measuring and one isn't, and they need different tools.

| What | Where it's measured | What you need |
| --- | --- | --- |
| [Your own AI features](#your-own-ai-features) | in your app | nothing new: `track()` and `journey()` |
| [Visits from AI assistants](#visits-from-ai-assistants) | in the browser | your own list of AI hostnames |
| [AI crawlers](#ai-crawlers) | on your server | your own list of user agents, and a place to keep the data apart |
| [AI agents browsing as a person](#ai-agents-browsing-as-a-person) | nowhere, reliably | — |

## Your own AI features

This needs no library feature: your AI features are events like any other.

```ts
analytics.track('ai_prompt_submitted', {
  feature: 'summarise',
  model: 'claude-opus-5',
  latency_ms: 1840,
})

analytics.track('ai_response_rated', { feature: 'summarise', rating: 'up' })
```

A conversation is a [journey](./tracking-events.md#journeys), so you can see where people give up:

```ts
const chat = analytics.journey('ai_chat')
chat.step('first_prompt')
chat.step('follow_up')
chat.complete({ turns: 2 })
```

Three things to keep in mind:

- **Never send the prompt or the answer.** They're your users' words, often personal, and Google Analytics keeps only
  the first 100 characters of a value anyway. Send a category, a feature name, or a length instead.
- **Token counts and costs belong on your server**, where you actually know them. Send them with
  [`sendMeasurementProtocolEvent()`](./measurement-protocol.md), tied to the same visitor.
- Keep names in `snake_case` and under 40 characters, like every other event.

## Visits from AI assistants

People arrive from answers in ChatGPT, Perplexity, Gemini and others. Those visits are ordinary referrals, so they're
already captured; what's missing is a label you can group by.

Give the library the hostnames you care about, and it labels matching visits:

```ts
createAnalytics({
  consent: 'denied',
  ga4: { measurementId: 'G-XXXXXXX' },
  attribution: {
    aiSources: {
      chatgpt: ['chatgpt.com', 'chat.openai.com'],
      perplexity: ['perplexity.ai'],
      gemini: ['gemini.google.com'],
      copilot: ['copilot.microsoft.com'],
    },
  },
})
```

**The list is yours.** The library ships no list, because assistants and their domains change far faster than a package
release; keeping it in your config means you can add one the day it appears. A referrer matches a hostname exactly or
as a subdomain of it (`www.perplexity.ai` matches `perplexity.ai`, `chatgpt.com.example.net` does not).

Where the label turns up:

```ts
analytics.getAttribution().lastTouch?.ai_source // 'chatgpt'
```

It also rides along on every event pushed to Google Tag Manager, inside `attribution`, so a container variable can pick
it up. It is **not** added to Google Analytics events automatically, because Google works campaigns out from the page
address itself. To report on it in GA4, send it as a parameter yourself:

```ts
const { lastTouch } = analytics.getAttribution()

analytics.track('sign_up', {
  method: 'google',
  ...(lastTouch?.ai_source && { ai_source: lastTouch.ai_source }),
})
```

Then register `ai_source` as an event-scoped custom dimension in **Admin → Custom definitions** to break reports down
by it.

Some assistants already add a campaign parameter to links they show, such as `utm_source=chatgpt.com`. Those visits
appear in your campaign reports too; the label is what makes the ones without a parameter countable.

## AI crawlers

Crawlers such as GPTBot, ClaudeBot and PerplexityBot fetch your pages to train or to answer questions. **They don't run
JavaScript**, so nothing in the browser can see them. You measure them where you see requests: a server middleware, an
edge function, or your access logs.

> **They must be kept apart from your visitor reports.** A crawler is not a person. Mixed in, it inflates users,
> sessions and page views, and drags down every rate you calculate from them. The library refuses to send crawler
> events unless you say how they're separated.

Two ways to keep them apart:

1. **A separate GA4 property** used only for crawlers. Pass its measurement ID and `keepSeparate: 'separate-property'`.
2. **A data filter** in your existing property. Pass `keepSeparate: { trafficType: 'ai_crawler' }`, then in GA4 open
   **Admin → Data settings → Data filters**, create an internal-traffic rule whose `traffic_type` value is
   `ai_crawler`, and set the filter to **Exclude**. Filters only apply from the day you create them, so set this up
   before you send anything.

Either way, every event is stamped with `ai_agent` (your label) and `traffic_type`, and those two can't be overridden.

```ts
import { matchAiAgent, sendAiCrawlerEvent } from 'react-marketing-tools/server'

// Your list, kept up to date by you: crawlers appear and rename themselves constantly.
const AI_AGENTS = {
  gptbot: ['GPTBot'],
  claudebot: ['ClaudeBot', 'anthropic-ai'],
  perplexitybot: ['PerplexityBot'],
  ccbot: ['CCBot'],
}

export const recordCrawl = async (request: Request) => {
  const agent = matchAiAgent({
    userAgent: request.headers.get('user-agent') ?? '',
    agents: AI_AGENTS,
  })
  if (!agent) return // a person, or a crawler you don't track

  await sendAiCrawlerEvent({
    measurementId: process.env.GA4_CRAWLER_ID!,
    apiSecret: process.env.GA4_CRAWLER_API_SECRET!,
    // Crawlers have no Google Analytics cookie, so you choose what counts as one "visitor":
    // one ID per crawler groups all its fetches; a random one per request counts each fetch.
    clientId: `crawler.${agent}`,
    agent,
    keepSeparate: 'separate-property',
    events: [
      { name: 'page_view', params: { page_location: request.url } },
    ],
  })
}
```

Notes:

- Measuring a crawler doesn't grant or deny it anything. What crawlers may fetch is still decided by your `robots.txt`
  and whatever blocking your CDN does.
- User agents are self-reported and can be faked. Treat these numbers as "traffic claiming to be GPTBot".
- Logs are cheaper than events. If you only want volumes, count them in your log tooling; send events when you want
  crawler activity beside your other Google Analytics data.

## AI agents browsing as a person

Agents that drive a real browser on someone's behalf are, deliberately, hard to tell apart from a person. The available
signals — `navigator.webdriver`, unusual user agents, no mouse movement — are weak, trivially switched off, and they
misfire on people using assistive technology or privacy browsers.

The library offers nothing for this on purpose. If you need a guess, treat it as a soft signal on your own events
(`automation_suspected: true`), never as a reason to block or change what someone sees.
