import { createGtmDestination } from '../destinations/gtm.js'
import type {
  Analytics,
  AnalyticsConfig,
  AnalyticsEvent,
  Destination,
} from './types.js'

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

  const destinations: Destination[] = [
    ...(config.gtm
      ? [createGtmDestination({ ...config.gtm, nonce: config.nonce })]
      : []),
    ...(config.destinations ?? []),
  ]
  // Events tracked before start() — e.g. from child components, whose effects run before their parent's.
  const queue: AnalyticsEvent[] = []
  let started = false

  const deliver = (event: AnalyticsEvent) => {
    for (const destination of destinations) destination.track(event)
  }

  return {
    start() {
      if (started || !isBrowser()) return
      started = true

      for (const destination of destinations) destination.start()
      queue.splice(0).forEach(deliver)
    },
    track(name, params = {}) {
      if (!isBrowser()) return

      const event: AnalyticsEvent = {
        name,
        params,
        eventId: createEventId(),
        timestamp: Date.now(),
      }

      if (started) deliver(event)
      else queue.push(event)
    },
  }
}
