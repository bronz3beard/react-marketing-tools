import type { DemoIds } from './ids'

/** The setup to copy into an app: the visitor's IDs where they gave them, placeholders elsewhere. */
export const createSnippet = (ids: DemoIds): string =>
  [
    "import { createAnalytics } from 'react-marketing-tools'",
    '',
    'export const analytics = createAnalytics({',
    "  consent: 'denied', // until your consent banner records the visitor's choice",
    `  gtm: { containerId: '${ids.gtm ?? 'GTM-XXXXXXX'}' },`,
    `  ga4: { measurementId: '${ids.ga4 ?? 'G-XXXXXXXXXX'}' },`,
    `  metaPixel: { pixelId: '${ids.metaPixel ?? '1234567890123456'}' },`,
    "  server: { endpoint: '/api/track' }, // with createTrackHandler() on your server",
    '  autocapture: { clicks: true },',
    '})',
  ].join('\n')
