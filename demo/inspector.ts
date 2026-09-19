import type { ConsentState, Destination } from 'react-marketing-tools'

export type CallGroup = 'gtm' | 'gtag' | 'pixel' | 'relay'

export type InspectorRow = {
  id: number
  /** The library call that produced these vendor calls, e.g. `track('sign_up')`. */
  label: string
  eventId?: string
  consent?: ConsentState
  calls: Record<CallGroup, unknown[]>
}

export type Inspector = {
  destination: Destination
  subscribe(listener: () => void): () => void
  getRows(): InspectorRow[]
  clear(): void
}

type DemoWindow = Window & {
  dataLayer?: unknown[]
  fbq?: { queue?: unknown[] }
}

// gtag() and fbq() queue the Arguments object of each call; GTM's own pushes are plain objects.
const isArguments = (value: unknown): value is IArguments =>
  Object.prototype.toString.call(value) === '[object Arguments]'

const toCall = (entry: unknown): unknown[] =>
  Array.from(entry as ArrayLike<unknown>)

/**
 * A custom destination that shows what the built-in destinations handed to each vendor. Custom destinations run after
 * the built-in ones, so when it's called they've already queued their calls. Nothing leaves the page: the playground
 * doesn't load vendor scripts, and the relay's beacons are kept here instead of sent.
 */
export const createInspector = (): Inspector => {
  const page = window as DemoWindow
  const beacons: unknown[] = []
  let seen = {
    dataLayer: page.dataLayer?.length ?? 0,
    pixel: page.fbq?.queue?.length ?? 0,
    beacons: 0,
  }
  let rows: InspectorRow[] = []
  let consent: ConsentState | undefined
  let nextId = 1
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(listener => listener())

  navigator.sendBeacon = (_url, body) => {
    beacons.push(JSON.parse(String(body)))
    return true
  }

  const record = ({ label, eventId }: { label: string; eventId?: string }) => {
    const dataLayer = page.dataLayer ?? []
    const pixelQueue = page.fbq?.queue ?? []
    const newEntries = dataLayer.slice(seen.dataLayer)
    const calls = {
      gtm: newEntries.filter(entry => !isArguments(entry)),
      gtag: newEntries.filter(isArguments).map(toCall),
      pixel: pixelQueue.slice(seen.pixel).map(toCall),
      relay: beacons.slice(seen.beacons),
    }
    seen = {
      dataLayer: dataLayer.length,
      pixel: pixelQueue.length,
      beacons: beacons.length,
    }
    rows = [{ id: nextId++, label, eventId, consent, calls }, ...rows]
    notify()
  }

  return {
    destination: {
      name: 'inspector',
      start(context) {
        consent = context.consent
        record({ label: 'analytics.start()' })
      },
      track(event) {
        record({ label: `track('${event.name}')`, eventId: event.eventId })
      },
      page(event) {
        record({ label: 'page()', eventId: event.eventId })
      },
      consent(state) {
        consent = state
        record({ label: 'consent.update()' })
      },
      identify({ userId }) {
        record({ label: `identify('${userId}')` })
      },
      reset() {
        record({ label: 'reset()' })
      },
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getRows: () => rows,
    clear() {
      rows = []
      notify()
    },
  }
}
