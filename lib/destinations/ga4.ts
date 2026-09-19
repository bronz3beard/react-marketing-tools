import type {
  AnalyticsEvent,
  Destination,
  EventParams,
  Ga4Config,
  Identity,
} from '../core/types.js'
import { gtag, hasGtag, toHttpsUrl } from './googleTag.js'
import { injectScript, isScriptOnPage } from './loadScript.js'

type Ga4DestinationOptions = Ga4Config & { nonce?: string }

const MEASUREMENT_ID = /^G-[A-Z0-9]+$/

export const createGa4Destination = ({
  measurementId,
  pageViews = 'auto',
  loadScript = true,
  serverContainerUrl,
  nonce,
}: Ga4DestinationOptions): Destination => {
  if (!MEASUREMENT_ID.test(measurementId)) {
    throw new Error(
      `[react-marketing-tools] ga4.measurementId must look like "G-XXXXXXX" (received ${JSON.stringify(measurementId)}).`,
    )
  }
  if (serverContainerUrl !== undefined) {
    toHttpsUrl(serverContainerUrl, 'ga4.serverContainerUrl')
  }

  const src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`

  // Through a server container the event id travels with the event, so server-side tags (e.g. Meta Conversions API)
  // can deduplicate against the browser.
  const toGa4Params = (params: EventParams, eventId: string): EventParams =>
    serverContainerUrl ? { ...params, event_id: eventId } : params

  return {
    name: 'ga4',
    start() {
      // A page that already runs the gtag snippet has sent 'js' and loaded gtag.js; only this stream's config is needed.
      if (!hasGtag()) {
        gtag()('js', new Date())
        if (loadScript && !isScriptOnPage(src)) injectScript({ src, nonce })
      }
      gtag()('config', measurementId, {
        ...(pageViews === 'manual' ? { send_page_view: false } : {}),
        ...(serverContainerUrl
          ? { server_container_url: serverContainerUrl }
          : {}),
      })
    },
    track({ name, params, eventId }: AnalyticsEvent) {
      gtag()('event', name, toGa4Params(params, eventId))
    },
    page({ params, eventId }: AnalyticsEvent) {
      // In 'auto' mode GA4 records page views itself (config + Enhanced Measurement history changes).
      if (pageViews === 'manual') {
        gtag()('event', 'page_view', toGa4Params(params, eventId))
      }
    },
    identify({ userId }: Identity) {
      gtag()('set', { user_id: userId })
    },
    reset() {
      gtag()('set', { user_id: null })
    },
  }
}
