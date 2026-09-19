export type ConsentStatus = 'granted' | 'denied'

/** Event parameters, passed to every destination as-is. */
export type EventParams = Record<string, unknown>

export type AnalyticsEvent = {
  name: string
  params: EventParams
  /** Unique per `track()` call and shared by every destination, so vendors can deduplicate the same event. */
  eventId: string
  /** Milliseconds since the Unix epoch at the moment `track()` was called. */
  timestamp: number
}

/** Somewhere events are sent. Built-in destinations are configured by key; custom ones go in `destinations`. */
export type Destination = {
  name: string
  /** Called once, in the browser, by `analytics.start()`. */
  start(): void
  track(event: AnalyticsEvent): void
}

export type GtmConfig = {
  /** Google Tag Manager container ID, e.g. `GTM-XXXXXXX`. */
  containerId: string
  /** Set to `false` when the page already includes the GTM snippet. Defaults to `true`. */
  loadScript?: boolean
}

export type AnalyticsConfig = {
  /** Initial consent state. Required, so every site makes an explicit choice. */
  consent: ConsentStatus
  gtm?: GtmConfig
  /** Custom destinations, in addition to the built-in ones. */
  destinations?: Destination[]
  /** Content-Security-Policy nonce added to every script the library injects. */
  nonce?: string
}

export type Analytics = {
  /** Loads vendor scripts and delivers queued events. Safe to call more than once; does nothing outside the browser. */
  start(): void
  /** Sends an event to every destination, queued until `start()`. Does nothing outside the browser. */
  track(name: string, params?: EventParams): void
}
