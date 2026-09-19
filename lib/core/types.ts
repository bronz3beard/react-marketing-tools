import type { AnalyticsError } from './errors.js'

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
  /** Called once, in the browser, by `analytics.start()`. */
  start(): void
  track(event: AnalyticsEvent): void
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
}

export type AnalyticsConfig = {
  /** Initial consent state. Required, so every site makes an explicit choice. */
  consent: ConsentStatus
  gtm?: GtmConfig
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
  track(name: string, params?: EventParams): void
  /** Sends a `page_view` with the current `page_location` and `page_title`, plus any params given. */
  page(params?: EventParams): void
  /** Associates later events with a user. `userId` must not be personal data such as an email address. */
  identify(userId: string, traits?: IdentityTraits): void
  /** Forgets the identified user, e.g. on logout. */
  reset(): void
}
