import type {
  AnalyticsEvent,
  Destination,
  GtmConfig,
  Identity,
} from '../core/types.js'
import { dataLayer, toHttpsUrl } from './googleTag.js'
import { injectScript, isScriptOnPage } from './loadScript.js'

type GtmDestinationOptions = GtmConfig & { nonce?: string }

const CONTAINER_ID = /^GTM-[A-Z0-9]+$/

// A custom script URL serves gtm.js from your own domain, e.g. a server-side GTM container.
const containerScriptSrc = (containerId: string, scriptUrl?: string) => {
  const url = toHttpsUrl(
    scriptUrl ?? 'https://www.googletagmanager.com/gtm.js',
    'gtm.scriptUrl',
  )
  url.searchParams.set('id', containerId)
  return url.href
}

export const createGtmDestination = ({
  containerId,
  loadScript = true,
  scriptUrl,
  nonce,
}: GtmDestinationOptions): Destination => {
  if (!CONTAINER_ID.test(containerId)) {
    throw new Error(
      `[react-marketing-tools] gtm.containerId must look like "GTM-XXXXXXX" (received ${JSON.stringify(containerId)}).`,
    )
  }

  const src = containerScriptSrc(containerId, scriptUrl)

  return {
    name: 'gtm',
    start() {
      const layer = dataLayer()
      // Mirrors the official GTM snippet. Skipped when the snippet already ran, which would fire "gtm.js" twice.
      if (!loadScript || isScriptOnPage(src)) return

      layer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      injectScript({ src, nonce })
    },
    track({ name, params, eventId }: AnalyticsEvent) {
      // `event` and `event_id` are set last so params can never overwrite them.
      dataLayer().push({ ...params, event: name, event_id: eventId })
    },
    identify({ userId }: Identity) {
      // Traits are personal data and never go to the dataLayer.
      dataLayer().push({ event: 'identify', user_id: userId })
    },
    reset() {
      // GTM keeps pushed keys in its data model, so user_id must be cleared explicitly.
      dataLayer().push({ event: 'reset', user_id: undefined })
    },
  }
}
