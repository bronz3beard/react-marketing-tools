import type { Attribution } from '../core/types.js'
import { toAttribution } from './attribution.js'

const FIRST_TOUCH_KEY = 'rmt:attribution:first'
const LAST_TOUCH_KEY = 'rmt:attribution:last'
const DAY_MS = 86_400_000

type StorageName = 'localStorage' | 'sessionStorage'

// Storage can be unavailable (private browsing, blocked site data). That's the visitor's choice, not an error:
// attribution then lives in memory for the page.
const withStorage = <T>(
  name: StorageName,
  operation: (storage: Storage) => T,
): T | undefined => {
  try {
    return operation(window[name])
  } catch {
    return undefined
  }
}

const readTouch = (name: StorageName, key: string) =>
  withStorage(name, storage => {
    const raw = storage.getItem(key)
    return raw === null ? undefined : toAttribution(JSON.parse(raw))
  })

/**
 * First and last campaign touch. The caller decides when storage may be used: reading or writing device storage both
 * need analytics consent (ePrivacy Directive Art. 5(3)).
 */
export const createAttributionTracker = ({ ttlDays }: { ttlDays: number }) => {
  let firstTouch: Attribution | undefined
  let lastTouch: Attribution | undefined

  const isFresh = (touch: Attribution) =>
    Date.now() - touch.captured_at < ttlDays * DAY_MS

  return {
    /** Records a touch in memory. */
    observe(touch: Attribution | undefined) {
      if (!touch) return
      firstTouch ??= touch
      lastTouch = touch
    },
    /** Merges touches stored on earlier visits: the oldest unexpired first touch wins; this session's last touch wins. */
    restore() {
      const storedFirst = readTouch('localStorage', FIRST_TOUCH_KEY)
      if (
        storedFirst &&
        isFresh(storedFirst) &&
        (!firstTouch || storedFirst.captured_at <= firstTouch.captured_at)
      ) {
        firstTouch = storedFirst
      }
      lastTouch ??= readTouch('sessionStorage', LAST_TOUCH_KEY)
    },
    persist() {
      withStorage('localStorage', storage =>
        firstTouch && isFresh(firstTouch)
          ? storage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch))
          : storage.removeItem(FIRST_TOUCH_KEY),
      )
      if (lastTouch) {
        withStorage('sessionStorage', storage =>
          storage.setItem(LAST_TOUCH_KEY, JSON.stringify(lastTouch)),
        )
      }
    },
    /** Erases stored touches, e.g. when analytics consent is withdrawn. In-memory touches are kept for this page. */
    erase() {
      withStorage('localStorage', storage =>
        storage.removeItem(FIRST_TOUCH_KEY),
      )
      withStorage('sessionStorage', storage =>
        storage.removeItem(LAST_TOUCH_KEY),
      )
    },
    get: () => ({ firstTouch, lastTouch }),
  }
}

export type AttributionTracker = ReturnType<typeof createAttributionTracker>
