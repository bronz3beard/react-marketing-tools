import type {
  AnalyticsEvent,
  ConsentState,
  Destination,
  Identity,
  MetaPixelConfig,
} from '../core/types.js'
import { injectScript } from './loadScript.js'
import { toMetaCall } from './metaEventMap.js'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
  disablePushState?: boolean
}
type MetaWindow = Window & { fbq?: Fbq; _fbq?: Fbq }

type MetaPixelDestinationOptions = MetaPixelConfig & { nonce?: string }

const PIXEL_ID = /^\d+$/
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

/** The page's `fbq()`, defining Meta's official base-code stub when the page doesn't have one yet. */
const fbq = (): Fbq => {
  const metaWindow = window as MetaWindow
  if (!metaWindow.fbq) {
    const stub = function fbq() {
      // eslint-disable-next-line prefer-rest-params -- Meta's base code queues the Arguments object, which fbevents.js replays.
      const args = arguments
      if (stub.callMethod) stub.callMethod.call(stub, ...args)
      else stub.queue.push(args)
    } as Fbq
    stub.push = stub
    stub.loaded = true
    stub.version = '2.0'
    stub.queue = []
    metaWindow.fbq = stub
    metaWindow._fbq ??= stub
  }
  return metaWindow.fbq
}

const isFbeventsOnPage = (): boolean =>
  Array.from(document.scripts).some(
    script =>
      URL.canParse(script.src) &&
      new URL(script.src).pathname.endsWith('/fbevents.js'),
  )

// Manual advanced matching: the Pixel normalises and SHA-256 hashes these values itself.
const toMetaUserData = ({ userId, traits }: Identity) =>
  Object.fromEntries(
    Object.entries({
      external_id: userId,
      em: traits.email,
      ph: traits.phone,
      fn: traits.firstName,
      ln: traits.lastName,
    }).filter(([, value]) => value !== undefined),
  )

// Sending user data to Meta is what `adUserData` governs; it follows `ads` unless set explicitly.
const toMetaConsent = (consent: ConsentState) =>
  consent.adUserData === 'granted' ? 'grant' : 'revoke'

export const createMetaPixelDestination = ({
  pixelId,
  pageViews = 'auto',
  loadScript = true,
  nonce,
}: MetaPixelDestinationOptions): Destination => {
  if (!PIXEL_ID.test(pixelId)) {
    throw new Error(
      `[react-marketing-tools] metaPixel.pixelId must be the numeric pixel ID (received ${JSON.stringify(pixelId)}).`,
    )
  }

  return {
    name: 'metaPixel',
    start({ consent, identity }) {
      const send = fbq()
      // The Pixel tracks client-side navigation itself unless this is set before it loads.
      if (pageViews === 'manual') send.disablePushState = true
      // Must come before init so nothing is sent until the visitor consents.
      if (toMetaConsent(consent) === 'revoke') send('consent', 'revoke')
      // The Pixel only accepts advanced-matching data in its first init (verified against fbevents.js 2.9.403).
      if (identity) send('init', pixelId, toMetaUserData(identity))
      else send('init', pixelId)
      // Meta's base code sends PageView on load; it never reaches the Conversions API, so it needs no eventID.
      if (pageViews === 'auto') send('track', 'PageView')

      if (loadScript && !isFbeventsOnPage()) {
        injectScript({ src: SCRIPT_SRC, nonce })
      }
    },
    track(event: AnalyticsEvent) {
      if (event.options?.meta === false) return
      const { command, name, params } = toMetaCall(event)
      fbq()(command, name, params, { eventID: event.eventId })
    },
    page({ eventId }: AnalyticsEvent) {
      if (pageViews === 'manual') {
        fbq()('track', 'PageView', {}, { eventID: eventId })
      }
    },
    consent(state: ConsentState) {
      fbq()('consent', toMetaConsent(state))
    },
  }
}
