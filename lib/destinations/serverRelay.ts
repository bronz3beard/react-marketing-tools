import { deriveFbc } from '../attribution/attribution.js'
import { AnalyticsError } from '../core/errors.js'
import type {
  AnalyticsEvent,
  ConsentStatus,
  Destination,
  EventParams,
  Identity,
  ServerRelayConfig,
} from '../core/types.js'
import { parseCookie } from '../shared/cookies.js'
import { toMetaCall } from './metaEventMap.js'

export type RelayUserData = {
  externalId?: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  fbc?: string
  fbp?: string
}

/** The body posted to your endpoint and read by `createTrackHandler()`. Versioned, so pages cached before a change keep working. */
export type RelayPayload = {
  v: 1
  /** The name the Pixel received: Meta only deduplicates events whose name and ID both match. */
  eventName: string
  /** The Pixel's `eventID`. */
  eventId: string
  customData: EventParams
  eventSourceUrl: string
  consent: { adUserData: ConsentStatus }
  userData: RelayUserData
}

type ServerRelayOptions = ServerRelayConfig & {
  /** Off when the Pixel sends its own page views: they carry no event ID, so relayed ones would be counted twice. */
  relayPageViews: boolean
  /** The visitor ID, if it's allowed and available: Meta's `external_id` for a visitor who isn't identified. */
  visitorId: () => string | undefined
  onError: (error: AnalyticsError) => void
}

const isValidEndpoint = (endpoint: string): boolean =>
  (endpoint.startsWith('/') && !endpoint.startsWith('//')) ||
  (URL.canParse(endpoint) && new URL(endpoint).protocol === 'https:')

export const createServerRelayDestination = ({
  endpoint,
  relayPageViews,
  visitorId,
  onError,
}: ServerRelayOptions): Destination => {
  if (!isValidEndpoint(endpoint)) {
    throw new Error(
      `[react-marketing-tools] server.endpoint must be a path on your site, such as '/api/track', or an https:// URL (received ${JSON.stringify(endpoint)}).`,
    )
  }

  // The Pixel's consent signal: nothing leaves the page for Meta without it.
  let adUserData: ConsentStatus = 'denied'
  let identity: Identity | undefined

  const toUserData = (event: AnalyticsEvent): RelayUserData => {
    const fbp = parseCookie(document.cookie, '_fbp')
    const fbc = deriveFbc({
      fbcCookie: parseCookie(document.cookie, '_fbc'),
      touch: event.attribution,
    })
    // The user ID is also what the Pixel's advanced matching knows, so it wins over the visitor ID.
    const externalId = identity?.userId ?? visitorId()
    return {
      ...(externalId && { externalId }),
      ...identity?.traits,
      ...(fbc && { fbc }),
      ...(fbp && { fbp }),
    }
  }

  const post = ({
    event,
    eventName,
    customData,
  }: {
    event: AnalyticsEvent
    eventName: string
    customData: EventParams
  }) => {
    const payload: RelayPayload = {
      v: 1,
      eventName,
      eventId: event.eventId,
      customData,
      eventSourceUrl: location.href,
      consent: { adUserData },
      userData: toUserData(event),
    }
    const body = JSON.stringify(payload)

    // A beacon survives the page unloading, and a string body is text/plain, which needs no CORS preflight.
    if (
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(endpoint, body)
    ) {
      return
    }
    // No beacon, or its queue is full. The response is never read, so no-cors keeps a cross-origin endpoint from
    // turning into a CORS error.
    fetch(endpoint, {
      method: 'POST',
      body,
      keepalive: true,
      mode: 'no-cors',
    }).catch((cause: unknown) => {
      onError(
        new AnalyticsError(
          'destination_failed',
          `destination "server" could not reach ${endpoint}`,
          { cause },
        ),
      )
    })
  }

  return {
    name: 'server',
    start(context) {
      adUserData = context.consent.adUserData
      identity = context.identity
    },
    track(event) {
      if (adUserData !== 'granted') return
      // The same mapping as the Pixel, so the server event's name matches the Pixel's.
      const { name, params } = toMetaCall(event)
      post({ event, eventName: name, customData: params })
    },
    page(event) {
      if (adUserData !== 'granted' || !relayPageViews) return
      post({ event, eventName: 'PageView', customData: {} })
    },
    consent(state) {
      adUserData = state.adUserData
    },
    identify(current) {
      identity = current
    },
    reset() {
      identity = undefined
    },
  }
}
