import { createGa4Destination } from '../destinations/ga4.js'
import { createGtmDestination } from '../destinations/gtm.js'
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
  ConsentUpdate,
  Destination,
  EventParams,
} from './types.js'
import {
  containsEmail,
  findEventNameProblem,
  findParamProblems,
  redactPii,
} from './validate.js'

const isBrowser = (): boolean => typeof window !== 'undefined'

// crypto.randomUUID only exists in secure contexts (HTTPS, localhost); plain-HTTP pages fall back to getRandomValues.
const createEventId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, digit =>
        (
          Number(digit) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] &
            (15 >> (Number(digit) / 4)))
        ).toString(16),
      )

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
  const destinations: Destination[] = [
    ...(config.gtm
      ? [createGtmDestination({ ...config.gtm, nonce: config.nonce })]
      : []),
    ...(config.ga4
      ? [createGa4Destination({ ...config.ga4, nonce: config.nonce })]
      : []),
    ...(config.destinations ?? []),
  ]
  // Calls made before start(), e.g. from child components, whose effects run before their parent's. One queue keeps
  // track, page, identify and reset in the order they happened.
  const queue: ((destination: Destination) => void)[] = []
  let started = false

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

  const createEvent = (
    name: string,
    params: EventParams,
  ): AnalyticsEvent | undefined => {
    const nameProblem = findEventNameProblem(name)
    if (nameProblem) {
      fail(new AnalyticsError('invalid_event', nameProblem))
      return undefined
    }

    for (const problem of findParamProblems(params)) {
      fail(new AnalyticsError('invalid_param', `event "${name}" ${problem}`))
    }

    const { params: safeParams, redactedKeys } = redactPii(params)
    if (redactedKeys.length > 0) {
      fail(
        new AnalyticsError(
          'pii_redacted',
          `event "${name}": personal data redacted from ${redactedKeys.join(', ')}`,
        ),
      )
    }

    return {
      name,
      params: safeParams,
      eventId: createEventId(),
      timestamp: Date.now(),
    }
  }

  return {
    start() {
      if (started || !isBrowser()) return
      started = true

      dispatch(destination => destination.start({ consent: initialConsent }))
      queue.splice(0).forEach(dispatch)
    },
    track(name, params = {}) {
      if (!isBrowser()) return

      const event = createEvent(name, params)
      if (event) send(destination => destination.track(event))
    },
    page(params = {}) {
      if (!isBrowser()) return

      const event = createEvent('page_view', {
        page_location: location.href,
        page_title: document.title,
        ...params,
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
      send(destination => destination.identify?.({ userId, traits }))
    },
    reset() {
      if (!isBrowser()) return

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

        const next = applyConsentUpdate(consent, update)
        consent = next
        send(destination => destination.consent?.(next))
      },
      get: () => consent,
    },
  }
}
