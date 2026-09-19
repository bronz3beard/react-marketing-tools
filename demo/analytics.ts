import { createAnalytics } from 'react-marketing-tools'
import type { DemoIds } from './ids'
import { createInspector } from './inspector'

/**
 * The playground's setup. Destinations without the visitor's own ID use a placeholder with `loadScript: false`, so no
 * script loads and nothing is sent; with their ID, the real script loads. Page views are manual so `page()` shows what
 * each vendor would get.
 */
export const createDemo = (ids: DemoIds = {}) => {
  const inspector = createInspector()
  const analytics = createAnalytics({
    consent: 'granted',
    gtm: {
      containerId: ids.gtm ?? 'GTM-DEMO123',
      loadScript: Boolean(ids.gtm),
    },
    ga4: {
      measurementId: ids.ga4 ?? 'G-DEMO12345',
      loadScript: Boolean(ids.ga4),
      pageViews: 'manual',
    },
    metaPixel: {
      pixelId: ids.metaPixel ?? '1234567890123456',
      loadScript: Boolean(ids.metaPixel),
      pageViews: 'manual',
    },
    server: { endpoint: '/api/track' },
    autocapture: { clicks: true },
    destinations: [inspector.destination],
  })
  return { analytics, inspector }
}
