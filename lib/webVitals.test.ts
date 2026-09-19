// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trackWebVitals } from './webVitals.js'

type Report = (metric: Record<string, unknown>) => void
const callbacks: Record<string, Report> = {}

vi.mock('web-vitals', () => ({
  onCLS: (report: Report) => (callbacks.CLS = report),
  onINP: (report: Report) => (callbacks.INP = report),
  onLCP: (report: Report) => (callbacks.LCP = report),
}))

const lcp = {
  name: 'LCP',
  value: 2100,
  delta: 2100,
  id: 'v5-123',
  rating: 'good',
  navigationType: 'navigate',
}

describe('trackWebVitals()', () => {
  beforeEach(() => {
    for (const key of Object.keys(callbacks)) delete callbacks[key]
  })

  it('reports LCP, INP and CLS as events with GA4’s recommended params, kept away from Meta', async () => {
    const analytics = { track: vi.fn() }

    await trackWebVitals(analytics)
    callbacks.LCP(lcp)

    expect(Object.keys(callbacks).sort()).toEqual(['CLS', 'INP', 'LCP'])
    expect(analytics.track).toHaveBeenCalledWith(
      'LCP',
      {
        value: 2100,
        metric_id: 'v5-123',
        metric_value: 2100,
        metric_delta: 2100,
        metric_rating: 'good',
      },
      { meta: false },
    )
  })

  it('keeps the page a metric was measured on, when it’s reported after a client-side navigation', async () => {
    const analytics = { track: vi.fn() }

    await trackWebVitals(analytics)
    callbacks.INP({
      ...lcp,
      name: 'INP',
      navigationURL: 'https://shop.test/pricing',
    })

    expect(analytics.track.mock.calls[0][1]).toMatchObject({
      page_location: 'https://shop.test/pricing',
    })
  })

  it('registers once per instance, so StrictMode’s second effect run doesn’t double every metric', async () => {
    const analytics = { track: vi.fn() }

    await trackWebVitals(analytics)
    const first = callbacks.LCP
    await trackWebVitals(analytics)

    expect(callbacks.LCP).toBe(first)
  })
})
