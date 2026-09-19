import type { Metric } from 'web-vitals'
import type { Analytics } from './core/types.js'

// Once per instance: React's <StrictMode> runs effects twice, and each call would otherwise report every metric again.
const reporting = new WeakSet<Pick<Analytics, 'track'>>()

/**
 * Reports Core Web Vitals (LCP, INP and CLS) as events, the way the `web-vitals` library recommends for GA4. Install it
 * first: `npm install web-vitals@^6`. It's downloaded when this is first called, and does nothing outside the browser.
 *
 * The events reach GA4 and Tag Manager, never the Meta Pixel or the relay.
 */
export const trackWebVitals = async (
  analytics: Pick<Analytics, 'track'>,
): Promise<void> => {
  if (typeof window === 'undefined' || reporting.has(analytics)) return
  reporting.add(analytics)

  const { onCLS, onINP, onLCP } = await import('web-vitals')
  const report = ({ name, value, delta, id, rating, navigationURL }: Metric) =>
    analytics.track(
      name,
      {
        value: delta, // `delta`, so GA4 can sum a metric's reports
        metric_id: id, // groups the reports of one metric instance
        metric_value: value,
        metric_delta: delta,
        metric_rating: rating,
        // Metrics can be reported after a client-side navigation, so keep the page they were measured on.
        ...(navigationURL && { page_location: navigationURL }),
      },
      { meta: false },
    )

  onCLS(report)
  onINP(report)
  onLCP(report)
}
