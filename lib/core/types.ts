import type { AnalyticsError } from './errors.js'

export type ConsentStatus = 'granted' | 'denied'

/**
 * The visitor's consent, per purpose. `ads` covers advertising storage; `adUserData` (sending user data to ad platforms)
 * and `adPersonalization` follow `ads` unless set explicitly.
 */
export type ConsentState = {
  analytics: ConsentStatus
  ads: ConsentStatus
  adUserData: ConsentStatus
  adPersonalization: ConsentStatus
}

export type ConsentUpdate = Partial<ConsentState>

/** Event parameters, passed to every destination as-is. */
export type EventParams = Record<string, unknown>

/** Per-call adjustments for one destination, when the automatic mapping isn't what you want. */
export type TrackOptions = {
  /**
   * Meta Pixel and the relay: send as this event name (standard or custom), with these params merged over the mapped
   * ones, or `false` to keep the event away from Meta.
   */
  meta?: false | { event?: string; params?: EventParams }
}

export type CampaignParam =
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'
  | 'utm_id'
  | 'utm_source_platform'
  | 'utm_creative_format'
  | 'utm_marketing_tactic'
  | 'gclid'
  | 'gbraid'
  | 'wbraid'
  | 'dclid'
  | 'fbclid'
  | 'msclkid'
  | 'ttclid'
  | 'li_fat_id'
  | 'twclid'

/**
 * Labels for visits that arrive from AI assistants, as `{ label: [hostname, …] }`, for example
 * `{ chatgpt: ['chatgpt.com', 'chat.openai.com'], perplexity: ['perplexity.ai'] }`. A referrer matches a hostname
 * exactly or as a subdomain of it. The list is yours to keep up to date: the library ships none.
 */
export type AiSources = Record<string, string[]>

/** Where a visit came from: the campaign params and ad click IDs of its landing URL. */
export type Attribution = Partial<Record<CampaignParam, string>> & {
  /** Origin and path of the landing page, without its query string. */
  landing_page: string
  /** Origin and path of the referring page, when there was one. */
  referrer?: string
  /** Your label for the AI assistant this visit came from, when the referrer matched `attribution.aiSources`. */
  ai_source?: string
  /** Milliseconds since the Unix epoch when the visit was captured. */
  captured_at: number
}

export type AttributionSnapshot = {
  /** The first campaign touch within the attribution window. */
  firstTouch?: Attribution
  /** The most recent campaign touch in this browser session. */
  lastTouch?: Attribution
  /** Meta click ID (`_fbc`), for the Conversions API. Only with `adUserData` consent. */
  fbc?: string
  /** Meta browser ID (`_fbp`), for the Conversions API. Only with `adUserData` consent. */
  fbp?: string
}

export type AnalyticsEvent = {
  name: string
  params: EventParams
  options?: TrackOptions
  /** The last campaign touch when the event was tracked. */
  attribution?: Attribution
  /** Unique per `track()` call and shared by every destination, so vendors can deduplicate the same event. */
  eventId: string
  /** Milliseconds since the Unix epoch at the moment `track()` was called. */
  timestamp: number
}

/**
 * Personal data about the identified user. It is only given to destinations that match users with it (hashed by the
 * vendor or on your server). It is never added to event params or the dataLayer.
 */
export type IdentityTraits = {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
}

export type Identity = {
  userId: string
  traits: IdentityTraits
}

/** Somewhere events are sent. Built-in destinations are configured by key; custom ones go in `destinations`. */
export type Destination = {
  name: string
  /**
   * Called once, in the browser, by `analytics.start()`, with the consent state the page started with and the user
   * identified before start, if any. Some vendors (the Meta Pixel) only accept user data when they initialise.
   */
  start(context: { consent: ConsentState; identity?: Identity }): void
  track(event: AnalyticsEvent): void
  /** Receives every consent change, in order with events. */
  consent?(state: ConsentState): void
  /** Receives `page_view` events. Destinations without it get them through `track`. */
  page?(event: AnalyticsEvent): void
  identify?(identity: Identity): void
  /** Forget the identified user, e.g. on logout. */
  reset?(): void
}

export type GtmConfig = {
  /** Google Tag Manager container ID, e.g. `GTM-XXXXXXX`. */
  containerId: string
  /** Set to `false` when the page already includes the GTM snippet. Defaults to `true`. */
  loadScript?: boolean
  /** Load `gtm.js` from this https URL instead of googletagmanager.com, e.g. your server-side GTM domain. */
  scriptUrl?: string
  /** Milliseconds tags wait for a consent update when a Consent Mode signal starts denied. Defaults to 500. */
  waitForUpdate?: number
}

export type Ga4Config = {
  /** Google Analytics 4 measurement ID, e.g. `G-XXXXXXX`. */
  measurementId: string
  /**
   * `'auto'` (default): GA4 records page views itself, including history changes when Enhanced Measurement is on.
   * `'manual'`: only `analytics.page()` sends page views.
   */
  pageViews?: 'auto' | 'manual'
  /** Set to `false` when the page already loads gtag.js. Defaults to `true`. */
  loadScript?: boolean
  /** Your server-side GTM URL (https). Hits go there instead of Google, and events carry `event_id`. */
  serverContainerUrl?: string
  /** Milliseconds tags wait for a consent update when a Consent Mode signal starts denied. Defaults to 500. */
  waitForUpdate?: number
}

export type MetaPixelConfig = {
  /** Meta Pixel (dataset) ID, e.g. `1234567890123456`. */
  pixelId: string
  /**
   * `'auto'` (default): the Pixel sends PageView on load and on client-side navigation itself.
   * `'manual'`: only `analytics.page()` sends PageView.
   */
  pageViews?: 'auto' | 'manual'
  /** Set to `false` when the page already includes the Meta Pixel base code. Defaults to `true`. */
  loadScript?: boolean
}

/**
 * A multi-step flow, such as a checkout. Its first call also sends `journey_start`; every event carries `journey_id` and
 * `journey_name`.
 */
export type Journey = {
  /** Sends `journey_step` with `step_name` and `step_index` (1 for the first step). */
  step(stepName: string, params?: EventParams): void
  /** Sends `journey_complete` with `step_count`. The journey then ends. */
  complete(params?: EventParams): void
  /** Sends `journey_abandon` with `step_count`, the last `step_name` and `reason`. The journey then ends. */
  abandon(reason?: string): void
}

export type ServerRelayConfig = {
  /**
   * Where to post events for your `createTrackHandler()` endpoint, which forwards them to the Meta Conversions API with
   * the Pixel's event ID. A path on your site (`'/api/track'`) or an https URL.
   */
  endpoint: string
}

/**
 * How the visitor ID is made. `'random'`: a random ID kept in the browser's storage, with analytics consent.
 * `{ fingerprint }`: your function's browser fingerprint, with analytics and advertising consent, never stored.
 * `false`: no visitor ID.
 */
export type VisitorIdConfig =
  'random' | false | { fingerprint: () => Promise<string> }

export type AnalyticsConfig = {
  /** Initial consent for every purpose. Required, so every site makes an explicit choice. */
  consent: ConsentStatus
  /**
   * Honour the browser's Global Privacy Control signal by starting the advertising signals denied. Defaults to `true`.
   * An explicit `analytics.consent.update()` still wins.
   */
  respectGpc?: boolean
  /**
   * Capture UTM params and ad click IDs from landing URLs. Defaults to `true`. First and last touch are stored in the
   * browser only with analytics consent; `ttlDays` (default 90) is how long a first touch is kept. `aiSources` labels
   * visits that arrive from AI assistants.
   */
  attribution?: boolean | { ttlDays?: number; aiSources?: AiSources }
  /** A stable ID for this visitor, only with consent and never sent to GA4. Defaults to `'random'`. */
  visitorId?: VisitorIdConfig
  /** `clicks`: track clicks on elements with a `data-analytics-event` attribute. Off by default. */
  autocapture?: { clicks?: boolean }
  gtm?: GtmConfig
  ga4?: Ga4Config
  metaPixel?: MetaPixelConfig
  /** Relays events to your server for the Meta Conversions API. Only with `adUserData` consent. */
  server?: ServerRelayConfig
  /** Custom destinations, in addition to the built-in ones. */
  destinations?: Destination[]
  /** Content-Security-Policy nonce added to every script the library injects. */
  nonce?: string
  /** Throw on invalid events and personal data instead of reporting them. Turn on in development. */
  debug?: boolean
  /** Receives every problem the library reports. Defaults to `console.error`. */
  onError?: (error: AnalyticsError) => void
}

export type Analytics = {
  /** Loads vendor scripts and delivers queued events. Safe to call more than once; does nothing outside the browser. */
  start(): void
  /** Sends an event to every destination, queued until `start()`. Does nothing outside the browser. */
  track(name: string, params?: EventParams, options?: TrackOptions): void
  /** Sends a `page_view` with the current `page_location` and `page_title`, plus any params given. */
  page(params?: EventParams): void
  /** Starts tracking a multi-step flow. Create it once per flow (not on every render): each journey has its own ID. */
  journey(name: string): Journey
  /** Associates later events with a user. `userId` must not be personal data such as an email address. */
  identify(userId: string, traits?: IdentityTraits): void
  /** Forgets the identified user, e.g. on logout. */
  reset(): void
  /** Campaign attribution for this visitor. Empty outside the browser. */
  getAttribution(): AttributionSnapshot
  /**
   * This visitor's ID, once `start()` has run. `undefined` without the consent it needs, with `visitorId: false`, or
   * outside the browser.
   */
  getVisitorId(): Promise<string | undefined>
  consent: {
    /** Records the visitor's choice, e.g. from your consent banner. Omitted purposes keep their current state. */
    update(update: ConsentUpdate): void
    get(): ConsentState
  }
}
