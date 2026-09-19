import { createAnalytics } from 'react-marketing-tools'
import { createInspector } from './inspector'

/**
 * The playground's setup: every built-in destination with placeholder IDs and `loadScript: false`, so no vendor script
 * loads and nothing is sent. Page views are manual so `page()` shows what each vendor would get.
 */
export const createDemo = () => {
  const inspector = createInspector()
  const analytics = createAnalytics({
    consent: 'granted',
    gtm: { containerId: 'GTM-DEMO123', loadScript: false },
    ga4: {
      measurementId: 'G-DEMO12345',
      loadScript: false,
      pageViews: 'manual',
    },
    metaPixel: {
      pixelId: '1234567890123456',
      loadScript: false,
      pageViews: 'manual',
    },
    server: { endpoint: '/api/track' },
    autocapture: { clicks: true },
    destinations: [inspector.destination],
  })
  return { analytics, inspector }
}
