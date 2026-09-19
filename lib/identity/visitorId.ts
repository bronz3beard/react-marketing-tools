import { AnalyticsError } from '../core/errors.js'
import type { ConsentState, VisitorIdConfig } from '../core/types.js'
import { randomUuid } from '../shared/uuid.js'

const STORAGE_KEY = 'rmt:vid'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The caller decides when this may run: after `start()`, and it passes the current consent on every call. */
export type VisitorIdSource = {
  /** The ID if it's available right now: the random ID (created on first use), or a fingerprint already computed. */
  peek(consent: ConsentState): string | undefined
  get(consent: ConsentState): Promise<string | undefined>
  /** Forgets the ID, when analytics consent is withdrawn. */
  erase(): void
}

// Storage can be unavailable (private browsing, blocked site data). That's the visitor's choice, not an error: the ID
// then lasts for the page.
const readStoredId = (): string | undefined => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value !== null && UUID.test(value) ? value : undefined
  } catch {
    return undefined
  }
}

const storeId = (id: string | undefined): void => {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // See readStoredId.
  }
}

// Keeping an ID in the browser's storage needs analytics consent (ePrivacy Directive Art. 5(3)).
const createRandomSource = (): VisitorIdSource => {
  let current: string | undefined

  const peek = (consent: ConsentState) => {
    if (consent.analytics !== 'granted') return undefined
    const stored = readStoredId()
    if (stored) return (current = stored)
    current ??= randomUuid()
    storeId(current)
    return current
  }

  return {
    peek,
    get: consent => Promise.resolve(peek(consent)),
    erase() {
      current = undefined
      storeId(undefined)
    },
  }
}

// Fingerprinting reads the device like a cookie would (EDPB Guidelines 2/2023), for analytics and ad matching, so it
// needs both consents. The result is kept in memory for the page and never stored.
const createFingerprintSource = ({
  fingerprint,
  onError,
}: {
  fingerprint: () => Promise<string>
  onError: (error: AnalyticsError) => void
}): VisitorIdSource => {
  let pending: Promise<string | undefined> | undefined
  let current: string | undefined

  const isAllowed = (consent: ConsentState) =>
    consent.analytics === 'granted' && consent.ads === 'granted'

  return {
    peek: consent => (isAllowed(consent) ? current : undefined),
    get(consent) {
      if (!isAllowed(consent)) return Promise.resolve(undefined)
      pending ??= Promise.resolve()
        .then(fingerprint)
        .then(result => {
          if (typeof result !== 'string' || result === '') {
            throw new TypeError(
              `expected a non-empty string, received ${JSON.stringify(result)}`,
            )
          }
          return (current = result)
        })
        .catch((cause: unknown) => {
          onError(
            new AnalyticsError(
              'visitor_id_failed',
              'visitorId.fingerprint failed, so this page has no visitor ID',
              { cause },
            ),
          )
          return undefined
        })
      return pending
    },
    erase() {
      pending = undefined
      current = undefined
    },
  }
}

export const createVisitorIdSource = ({
  config,
  onError,
}: {
  config: VisitorIdConfig
  onError: (error: AnalyticsError) => void
}): VisitorIdSource | undefined => {
  if (config === false) return undefined
  if (config === 'random') return createRandomSource()
  if (typeof config?.fingerprint === 'function') {
    return createFingerprintSource({ fingerprint: config.fingerprint, onError })
  }
  throw new Error(
    `[react-marketing-tools] visitorId must be 'random', false or { fingerprint: () => Promise<string> } (received ${JSON.stringify(config)}).`,
  )
}
