import { deriveFbc, parseAttribution } from '../attribution/attribution.js'
import { createAttributionTracker } from '../attribution/tracker.js'
import { createGa4Destination } from '../destinations/ga4.js'
import { createGtmDestination } from '../destinations/gtm.js'
import { createMetaPixelDestination } from '../destinations/metaPixel.js'
import { createServerRelayDestination } from '../destinations/serverRelay.js'
import { createVisitorIdSource } from '../identity/visitorId.js'
import {
  applyConsentUpdate,
  CONSENT_KEYS,
  initialConsentState,
  isConsentStatus,
  readGlobalPrivacyControl,
} from './consent.js'
import { AnalyticsError } from './errors.js'
import type {
  Analytics,
  AnalyticsConfig,
  AnalyticsEvent,
  AttributionSnapshot,
  ConsentUpdate,
  Destination,
  EventParams,
  Identity,
  TrackOptions,
} from './types.js'
import {
  containsEmail,
  findEventNameProblem,
  findParamProblems,
  redactPii,
} from './validate.js'
import { parseCookie } from '../shared/cookies.js'
import { randomUuid } from '../shared/uuid.js'

const isBrowser = (): boolean => typeof window !== 'undefined'

const DEFAULT_ATTRIBUTION_DAYS = 90

const assertValidConfig = (config: AnalyticsConfig): void => {
  if (config.consent !== 'granted' && config.consent !== 'denied') {
    throw new Error(
      `[react-marketing-tools] createAnalytics: "consent" must be 'granted' or 'denied' (received ${JSON.stringify(config.consent)}).`,
    )
  }
}

/**
 * Creates an analytics instance. It has no side effects until `start()`, so it is safe to create at module scope and
 * during server rendering.
 */
export const createAnalytics = (config: AnalyticsConfig): Analytics => {
  assertValidConfig(config)

  const { debug = false, onError = console.error, respectGpc = true } = config
  // Destinations start from this state; later changes reach them through the queue, in order with events.
  const initialConsent = initialConsentState({
    consent: config.consent,
    gpc: respectGpc && readGlobalPrivacyControl(),
  })
  let consent = initialConsent
  // The current user, handed to destinations at start: the Meta Pixel only accepts user data when it initialises.
  let identity: Identity | undefined
  const visitorIds = createVisitorIdSource({
    config: config.visitorId ?? 'random',
    onError,
  })
  // getVisitorId() waits for start(): no storage or fingerprinting before it, and child components ask before it runs.
  let markStarted = () => {}
  const whenStarted = new Promise<void>(resolve => {
    markStarted = resolve
  })
  const destinations: Destination[] = [
    ...(config.gtm
      ? [createGtmDestination({ ...config.gtm, nonce: config.nonce })]
      : []),
    ...(config.ga4
      ? [createGa4Destination({ ...config.ga4, nonce: config.nonce })]
      : []),
    ...(config.metaPixel
      ? [
          createMetaPixelDestination({
            ...config.metaPixel,
            nonce: config.nonce,
          }),
        ]
      : []),
    ...(config.server
      ? [
          createServerRelayDestination({
            ...config.server,
            relayPageViews:
              !config.metaPixel || config.metaPixel.pageViews === 'manual',
            visitorId: () => visitorIds?.peek(consent),
            onError,
          }),
        ]
      : []),
    ...(config.destinations ?? []),
  ]
  // Calls made before start(), e.g. from child components, whose effects run before their parent's. One queue keeps
  // track, page, identify and reset in the order they happened.
  const queue: ((destination: Destination) => void)[] = []
  let started = false

  const attribution =
    config.attribution === false
      ? undefined
      : createAttributionTracker({
          ttlDays:
            (typeof config.attribution === 'object' &&
              config.attribution.ttlDays) ||
            DEFAULT_ATTRIBUTION_DAYS,
        })
  let landingCaptured = false
  // Read once, on first use in the browser, so events tracked before start() carry the landing campaign too.
  const captureLanding = () => {
    if (landingCaptured) return
    landingCaptured = true
    attribution?.observe(
      parseAttribution({
        url: location.href,
        referrer: document.referrer,
        capturedAt: Date.now(),
      }),
    )
  }
  const canStoreAttribution = () => started && consent.analytics === 'granted'
  // The relay reads the visitor ID synchronously, so a fingerprint is computed as soon as it's allowed.
  const prepareVisitorId = () => {
    if (started && config.server) void visitorIds?.get(consent)
  }

  // Mistakes in how the library is called throw in debug so they surface in development; in production they're
  // reported and the app keeps running.
  const fail = (error: AnalyticsError): void => {
    if (debug) throw error
    onError(error)
  }

  // A failing vendor must never break the app or the other destinations, in any mode.
  const dispatch = (call: (destination: Destination) => void) => {
    for (const destination of destinations) {
      try {
        call(destination)
      } catch (cause) {
        onError(
          new AnalyticsError(
            'destination_failed',
            `destination "${destination.name}" failed`,
            { cause },
          ),
        )
      }
    }
  }

  const send = (call: (destination: Destination) => void) => {
    if (started) dispatch(call)
    else queue.push(call)
  }

  const createEvent = ({
    name,
    params,
    options,
  }: {
    name: string
    params: EventParams
    options?: TrackOptions
  }): AnalyticsEvent | undefined => {
    const nameProblem = findEventNameProblem(name)
    if (nameProblem) {
      fail(new AnalyticsError('invalid_event', nameProblem))
      return undefined
    }

    for (const problem of findParamProblems(params)) {
      fail(new AnalyticsError('invalid_param', `event "${name}" ${problem}`))
    }

    // Per-destination override params leave the page too, so they get the same personal-data protection.
    const safe = redactPii(params)
    const safeMeta = options?.meta?.params && redactPii(options.meta.params)
    const redactedKeys = [
      ...safe.redactedKeys,
      ...(safeMeta?.redactedKeys.map(key => `meta.${key}`) ?? []),
    ]
    if (redactedKeys.length > 0) {
      fail(
        new AnalyticsError(
          'pii_redacted',
          `event "${name}": personal data redacted from ${redactedKeys.join(', ')}`,
        ),
      )
    }

    captureLanding()
    const lastTouch = attribution?.get().lastTouch

    return {
      name,
      params: safe.params,
      ...(lastTouch && { attribution: lastTouch }),
      ...(options && {
        options: safeMeta
          ? { ...options, meta: { ...options.meta, params: safeMeta.params } }
          : options,
      }),
      eventId: randomUuid(),
      timestamp: Date.now(),
    }
  }

  return {
    start() {
      if (started || !isBrowser()) return
      started = true

      captureLanding()
      if (canStoreAttribution()) {
        attribution?.restore()
        attribution?.persist()
      }
      prepareVisitorId()

      dispatch(destination =>
        destination.start({ consent: initialConsent, identity }),
      )
      queue.splice(0).forEach(dispatch)
      markStarted()
    },
    track(name, params = {}, options) {
      if (!isBrowser()) return

      const event = createEvent({ name, params, options })
      if (event) send(destination => destination.track(event))
    },
    page(params = {}) {
      if (!isBrowser()) return

      // A client-side navigation can land on a new campaign URL; its referrer is the previous page, so none is kept.
      captureLanding()
      attribution?.observe(
        parseAttribution({ url: location.href, capturedAt: Date.now() }),
      )
      if (canStoreAttribution()) attribution?.persist()

      const event = createEvent({
        name: 'page_view',
        params: {
          page_location: location.href,
          page_title: document.title,
          ...params,
        },
      })
      if (event) {
        send(destination =>
          destination.page ? destination.page(event) : destination.track(event),
        )
      }
    },
    identify(userId, traits = {}) {
      if (!isBrowser()) return

      if (!userId || containsEmail(userId)) {
        fail(
          new AnalyticsError(
            'invalid_user_id',
            'identify() needs a non-empty user id that is not personal data such as an email address',
          ),
        )
        return
      }
      const current = { userId, traits }
      identity = current
      send(destination => destination.identify?.(current))
    },
    reset() {
      if (!isBrowser()) return

      identity = undefined
      send(destination => destination.reset?.())
    },
    consent: {
      update(update: ConsentUpdate) {
        // On a server one instance serves every request, so one visitor's choice must never change it.
        if (!isBrowser()) return

        const invalid = Object.entries(update).filter(
          ([key, value]) =>
            value !== undefined &&
            !(
              CONSENT_KEYS.includes(key as keyof ConsentUpdate) &&
              isConsentStatus(value)
            ),
        )
        if (invalid.length > 0) {
          fail(
            new AnalyticsError(
              'invalid_consent',
              `consent.update() ignored: ${invalid.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}. Use analytics, ads, adUserData or adPersonalization with 'granted' or 'denied'.`,
            ),
          )
          return
        }

        const previous = consent
        const next = applyConsentUpdate(consent, update)
        consent = next

        if (previous.analytics === 'granted' && next.analytics === 'denied') {
          // Withdrawal: stored attribution and the visitor ID are erased straight away, even before start().
          attribution?.erase()
          visitorIds?.erase()
        } else if (canStoreAttribution()) {
          attribution?.restore()
          attribution?.persist()
        }
        prepareVisitorId()

        send(destination => destination.consent?.(next))
      },
      get: () => consent,
    },
    getAttribution() {
      if (!isBrowser()) return {}

      captureLanding()
      const touches: AttributionSnapshot = attribution?.get() ?? {}
      // _fbc and _fbp identify the browser to Meta, so they're only read with consent to share user data with ad platforms.
      if (consent.adUserData !== 'granted') return touches

      const fbp = parseCookie(document.cookie, '_fbp')
      const fbc = deriveFbc({
        fbcCookie: parseCookie(document.cookie, '_fbc'),
        touch: touches.lastTouch,
      })
      return { ...touches, ...(fbc && { fbc }), ...(fbp && { fbp }) }
    },
    getVisitorId() {
      if (!isBrowser() || !visitorIds) return Promise.resolve(undefined)
      return whenStarted.then(() => visitorIds.get(consent))
    },
  }
}
