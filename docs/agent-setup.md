# Set this up with an AI assistant

A prompt you can paste into any AI coding assistant. It interviews you about your app and your analytics accounts,
then writes the setup, a checklist of the clicking you'll need to do in Google Tag Manager, Google Analytics and Meta,
and a way to check it all worked.

**Use it when** you have a working app and at least one analytics account, and you'd rather answer questions than read
guides. **Read the [integration walkthrough](./integration-walkthrough.md) instead** if you prefer doing it yourself,
or if you haven't created any analytics accounts yet.

**What it can't do:** create accounts, see inside your Tag Manager container, or open a browser to test. It writes code
and tells you what to click; you still do the clicking and the checking.

## The prompt

Paste everything between the lines into your assistant, in the repository you want to set up.

```text
You are setting up react-marketing-tools in this repository. Work through the steps below in order.

RULES
- Look before you ask. Read the repository first and tell me what you found; don't ask me things the code answers.
- Ask one question at a time, and wait for my answer. Offer a sensible default with each question.
- Use only the settings in the ALLOWED SETTINGS list at the end of this prompt. If something I ask for isn't in that
  list, say so plainly and ask how I want to proceed. Do not invent option names, and do not copy settings from other
  analytics libraries.
- Verify every setting you use against the installed package's type definitions, at
  node_modules/react-marketing-tools/dist/index.d.ts (and dist/server.d.ts for server code). Those files are the
  source of truth. If the package isn't installed yet, say so before writing code that depends on it.
- If you can't tell which framework or router this project uses, say so and ask. Never guess and write code anyway.
- Show me each file you intend to create or change, and wait for my confirmation before writing. Never overwrite a
  file without showing me the change first.
- Consent starts denied. Always write consent: 'denied' unless I explicitly tell you this app has no consent
  requirement, and then say once that I'm responsible for that decision.
- Secrets never go in client-side code. API secrets and access tokens belong in server-only environment variables,
  never in anything prefixed NEXT_PUBLIC_, VITE_, REACT_APP_ or similar.
- Never put personal data (email addresses, phone numbers, names, addresses) in event parameters. Personal data goes
  through identify() only.
- Everything you tell me to type must exist. Don't invent globals such as window.__ANALYTICS__ for the verification
  steps: the instance is a module export, not a global. If it would help me to reach it from the browser console, tell
  me to export it myself, and say so plainly.
- AnalyticsProvider starts analytics itself. Don't also call start() in an effect. Only code that doesn't use React
  calls start() directly.
- Event names: lower_snake_case, starting with a letter, 40 characters or fewer, and not starting with google_, ga_ or
  firebase_. Prefer Google's recommended names where one fits: sign_up, login, purchase, add_to_cart, begin_checkout,
  view_item, search, generate_lead.

STEP 1 — INSPECT THE REPOSITORY
Report what you find, in a short list:
- Framework and version, and which router (for example Next.js App Router, Next.js Pages Router, Vite + React Router,
  Remix, something else).
- TypeScript or JavaScript, and the package manager (npm, pnpm, yarn, bun).
- Any analytics already installed: react-ga4, react-gtm-module, @next/third-parties, posthog-js, hand-written gtag or
  fbq snippets, a Tag Manager snippet in the HTML. Name the files.
- Any consent banner or consent management platform.
- Whether this app has a server it can run code on (route handlers, API routes, server actions, a backend), or whether
  it's a static site.
- Where environment variables are configured.
Then ask me to confirm or correct that list before going further.

STEP 2 — ASK ABOUT MY ACCOUNTS
One question at a time:
- Which of these am I using: Google Tag Manager, Google Analytics 4, the Meta Pixel? For each, what is the ID?
- For Tag Manager: does the container already have tags and triggers, or is it empty? (This decides whether events
  will do anything once they arrive.)
- For Google Analytics: is there a web data stream, and do I want events sent through Tag Manager or directly?
- For Meta: do I also have a Conversions API access token, and do I want the relay (browser events also sent from my
  server, so they still arrive when the Pixel is blocked)?
- If I want the relay or server-side events: which origins should the endpoint accept, and where do secrets live?

STEP 3 — ASK WHAT I WANT TO MEASURE
One question at a time, and keep it short: I can add more later.
- Which two or three actions matter most? (Sign-ups, purchases, demo requests, a specific button.)
- Is this an ecommerce app? If so, do I want purchase, add_to_cart and the rest with items?
- Is there a multi-step flow worth measuring as a funnel (checkout, onboarding, application)?
- Do I want clicks tracked from HTML attributes, with no code, for simple buttons and links?
- Do I want a stable visitor ID for consenting visitors?
- Do I want page-speed metrics (Core Web Vitals) reported?
- Do I want my app's errors reported as events?
- Do I want visits from AI assistants (ChatGPT, Perplexity and so on) labelled? If so, I'll give you the hostnames.

STEP 4 — PRODUCE THREE THINGS
1. The code. Show every file, then write them after I confirm:
   - one module that creates the instance and exports it;
   - the provider wired in at the right place for my framework (for Next.js App Router, a client component; the
     instance module must be client-side too);
   - page views handled exactly once: either the vendors' automatic page views, or manual with page() on route
     changes — never both;
   - the events from step 3, in the components that own those actions;
   - server files only if I asked for them.
2. A manual checklist, as a numbered list, of what I must do in each service's interface: triggers and tags in Tag
   Manager, custom dimensions in Google Analytics for any parameter I want to report on, a test event code in Meta
   Events Manager, and any data filter I need. Write this list out even when the code is finished and the build
   passes: without a Tag Manager trigger and tag, my events reach the browser's dataLayer and stop there. A short
   summary of what's left over is not a substitute for the list.
   If I use both Tag Manager and Google Analytics, include a step telling me to check whether the container already
   sends page views to the same Analytics property, and which of the two to turn off if it does — otherwise every
   page view is counted twice.
3. A verification walkthrough: what to click in my app, and where each event should appear — the browser console
   (dataLayer), Tag Manager Preview, GA4 DebugView or Realtime, Meta Test events.

STEP 5 — CHECK YOUR OWN WORK
Before you finish:
- Confirm you produced all three things from step 4: the code, the numbered manual checklist, and the verification
  walkthrough. If one is missing, or you condensed it into a sentence or two, write it out properly now.
- Run the project's type check and build, and report the result. If either fails because of your changes, fix them.
- List every setting you used, and confirm each one appears in ALLOWED SETTINGS below.
- Confirm out loud: consent starts denied; no secret appears in client-side code; no personal data is in any event
  parameter; page views are wired once.
- Tell me what you did NOT do, and what I still have to do myself.

ALLOWED SETTINGS
createAnalytics() options: `consent` (required, 'granted' or 'denied'), `respectGpc`, `attribution`, `visitorId`,
`autocapture`, `gtm`, `ga4`, `metaPixel`, `server`, `destinations`, `nonce`, `debug`, `onError`.
Instance methods: `start`, `track`, `page`, `journey`, `identify`, `reset`, `getAttribution`, `getVisitorId`, and
`consent` (with `consent.update()` and `consent.get()`).
Per-call options, as the third argument to track(): `meta` — either { event, params } to change the name or parameters
the Meta Pixel receives (for example Meta's standard StartTrial instead of a custom event), or false to keep an event
away from Meta and the relay entirely.
A journey from journey(name) has step(name, params), complete(params) and abandon(reason).
Destination settings: gtm takes containerId, loadScript, scriptUrl, waitForUpdate. ga4 takes measurementId, pageViews,
loadScript, serverContainerUrl, waitForUpdate. metaPixel takes pixelId, pageViews, loadScript. server takes endpoint.
Entry points: react-marketing-tools (React), react-marketing-tools/core (no React), react-marketing-tools/server
(server only), react-marketing-tools/fingerprintjs and react-marketing-tools/web-vitals (optional extras).
Server functions: sendMeasurementProtocolEvent, readGa4Cookies, sendConversionsApiEvent, createTrackHandler,
matchAiAgent, sendAiCrawlerEvent.
Anything not in this list does not exist. If you think something is missing, ask me to check the API summary at
https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/api-summary.md rather than guessing.
```

## Checking the assistant's work

Before you trust it, read the diff for these six things. They're the mistakes assistants actually make:

1. **Consent**: the instance says `consent: 'denied'`, and something calls `consent.update()` when your banner answers.
2. **Secrets**: search the diff for your access token and API secret. They must appear only in server files, never in a
   variable name starting with `NEXT_PUBLIC_`, `VITE_` or `REACT_APP_`.
3. **Page views**: either `pageViews: 'manual'` plus a `page()` call on route changes, or neither. Both means every
   page view is counted twice.
4. **Invented settings**: any option not in the allowed list above. The
   [API summary](./api-summary.md) is the full list.
5. **Personal data**: no email address, name or phone number inside a `track()` call. Those belong in `identify()`.
6. **The manual checklist**: you should have been given a numbered list of what to do in Tag Manager, Google Analytics
   and Meta — not just code. Working code with no Tag Manager trigger sends your events into `dataLayer` where nothing
   is listening. If you only got code and a summary, ask for the list.

Then follow the verification steps in the [integration walkthrough](./integration-walkthrough.md#6-prove-it-arrived).
An assistant can write plausible code that sends nothing; only the checks prove it works.

## Stop the next assistant re-guessing all this

The prompt above is a one-off conversation. Whatever assistant you use next month starts with none of it, and will
cheerfully create a second analytics instance, invent an option, or put an access token in a `NEXT_PUBLIC_` variable —
the same mistakes the prompt spends its rules preventing.

Most coding assistants read a file called `AGENTS.md` in your repository root before they start work. Keeping a short
analytics section there is what makes the decisions stick. Fill in the angle brackets with what the setup actually
chose:

```markdown
## Analytics

This project uses react-marketing-tools. `<path/to/analytics.ts>` creates the one analytics instance and exports it.
Import that instance; never call `createAnalytics()` a second time.

- Track from components with `useAnalytics()`, and from non-React code with the exported instance.
- Event names are lower_snake_case, 40 characters or fewer, and never start with `google_`, `ga_` or `firebase_`.
  Prefer Google's recommended names where one fits: `sign_up`, `login`, `purchase`, `add_to_cart`, `begin_checkout`,
  `view_item`, `search`, `generate_lead`.
- Never put an email address, phone number, name or address in event parameters. Personal data goes through
  `identify()` only.
- Never put an API secret or access token in client-side code, or in any variable prefixed `NEXT_PUBLIC_`, `VITE_` or
  `REACT_APP_`. Server-only environment variables.
- Consent starts denied. Only `<the consent banner>` calls `consent.update()`. Don't change the starting value.
- Page views are handled by `<the vendors automatically | page() on route change>`. Never add the other one, or every
  page view is counted twice.
- Valid options are listed in the API summary:
  https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/api-summary.md
  If an option isn't on that page it doesn't exist — ask rather than invent one.
```

If your assistant reads a differently-named file (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`), put
the same section there instead. The file name changes; the content doesn't.

## Validation record

This prompt is tested against real repositories, not just written. Each run starts from a cold assistant with no
memory of this project, using fixtures that deliberately contain an older analytics library and no consent banner.

<!-- Updated by the S4 validation runs; see .loop-out/<runId>/ for the raw logs. -->

**Last validated:** 20 September 2026, against 1.0.0-beta.4.

| Date | Assistant | Fixture | Result |
| --- | --- | --- | --- |
| 2026-09-20 | Small model | Next.js 16 App Router, `react-gtm-module` already installed | Pass |
| 2026-09-20 | Mid-size model | Next.js 16 App Router, `react-gtm-module` already installed | Pass |
| 2026-09-20 | Large model | Vite + React Router, `react-gtm-module` already installed | Pass |

Earlier rounds failed, which is why a few rules above look oddly specific. One assistant invented a browser global
for its verification steps, so nothing it told you to type would have worked. Another called `start()` beside the
provider that already calls it. A third wrote correct code and then skipped the manual checklist — the worst of the
three, because the setup looks finished while every event lands in `dataLayer` with nothing listening for it. Each
rule was added, then every assistant was run again from scratch against a clean copy of the fixtures.

One caveat on the table: the three assistants are different sizes from the same vendor. The prompt avoids
vendor-specific syntax, but it hasn't been checked against an assistant from a different vendor — so treat the six
checks above as the real safety net, not this table.

If you run it and it gets something wrong, that's a bug in this page: please
[open an issue](https://github.com/bronz3beard/react-marketing-tools/issues) with what it produced.
