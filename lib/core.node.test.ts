import { describe, expect, it } from 'vitest'
import { createAnalytics } from './core.js'

describe('react-marketing-tools/core during server rendering', () => {
  it('can be created and called without a DOM', () => {
    expect(typeof window).toBe('undefined')

    const analytics = createAnalytics({
      consent: 'denied',
      gtm: { containerId: 'GTM-TEST1' },
    })

    expect(() => {
      analytics.track('page_ready')
      analytics.start()
    }).not.toThrow()
  })

  it('never lets one request’s consent choice change a shared server instance', () => {
    const shared = createAnalytics({ consent: 'denied' })

    shared.consent.update({ analytics: 'granted', ads: 'granted' })

    expect(shared.consent.get().analytics).toBe('denied')
  })
})
