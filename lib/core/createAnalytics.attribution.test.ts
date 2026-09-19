// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from './createAnalytics.js'
import type { AnalyticsEvent, Destination } from './types.js'

const land = (path: string) => history.replaceState({}, '', path)

const recorder = () => {
  const events: AnalyticsEvent[] = []
  const destination: Destination = {
    name: 'recorder',
    start() {},
    track: event => events.push(event),
  }
  return { destination, events }
}

const clearCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

describe('attribution', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    land('/')
  })

  afterEach(() => {
    clearCookie('_fbc')
    clearCookie('_fbp')
    vi.restoreAllMocks()
  })

  it('captures campaign params from the landing URL', () => {
    land('/sale?utm_source=news&utm_medium=email&gclid=abc')
    const analytics = createAnalytics({ consent: 'granted' })

    analytics.start()

    expect(analytics.getAttribution().lastTouch).toMatchObject({
      utm_source: 'news',
      utm_medium: 'email',
      gclid: 'abc',
      landing_page: `${location.origin}/sale`,
    })
  })

  it('attaches the last touch to events, including ones tracked before start', () => {
    land('/?utm_source=news')
    const { destination, events } = recorder()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.track('checkout_viewed')
    analytics.start()

    expect(events[0].attribution).toMatchObject({ utm_source: 'news' })
  })

  it('keeps the campaign when navigating to a page without campaign params, and picks up a new one', () => {
    land('/?utm_source=news')
    const analytics = createAnalytics({ consent: 'granted' })
    analytics.start()

    land('/pricing')
    analytics.page()
    expect(analytics.getAttribution().lastTouch?.utm_source).toBe('news')

    land('/promo?utm_source=ads')
    analytics.page()
    expect(analytics.getAttribution()).toMatchObject({
      firstTouch: { utm_source: 'news' },
      lastTouch: { utm_source: 'ads' },
    })
  })

  it('stores nothing without analytics consent', () => {
    land('/?utm_source=news')
    const analytics = createAnalytics({ consent: 'denied' })

    analytics.start()

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(analytics.getAttribution().lastTouch?.utm_source).toBe('news')
  })

  it('stores touches once analytics consent is granted, and erases them when it is withdrawn', () => {
    land('/?utm_source=news')
    const analytics = createAnalytics({ consent: 'denied' })
    analytics.start()

    analytics.consent.update({ analytics: 'granted' })
    expect(localStorage.getItem('rmt:attribution:first')).toContain('news')
    expect(sessionStorage.getItem('rmt:attribution:last')).toContain('news')

    analytics.consent.update({ analytics: 'denied' })
    expect(localStorage.getItem('rmt:attribution:first')).toBeNull()
    expect(sessionStorage.getItem('rmt:attribution:last')).toBeNull()
  })

  it('does not capture anything when attribution is off', () => {
    land('/?utm_source=news')
    const { destination, events } = recorder()
    const analytics = createAnalytics({
      consent: 'granted',
      attribution: false,
      destinations: [destination],
    })

    analytics.start()
    analytics.track('sign_up')

    expect(analytics.getAttribution()).toEqual({})
    expect(events[0].attribution).toBeUndefined()
  })

  describe('Meta identifiers', () => {
    it('are only read with consent to share user data with ad platforms', () => {
      document.cookie = '_fbp=fb.1.1700000000000.999'
      land('/?fbclid=XYZ')
      const analytics = createAnalytics({ consent: 'denied' })
      analytics.start()

      expect(analytics.getAttribution()).not.toHaveProperty('fbp')
      expect(analytics.getAttribution()).not.toHaveProperty('fbc')

      analytics.consent.update({ ads: 'granted' })
      expect(analytics.getAttribution()).toMatchObject({
        fbp: 'fb.1.1700000000000.999',
        fbc: expect.stringMatching(/^fb\.1\.\d+\.XYZ$/),
      })
    })

    it('use the Pixel’s _fbc cookie as-is when it exists', () => {
      document.cookie = '_fbc=fb.1.1700000000000.FROMPIXEL'
      land('/?fbclid=XYZ')
      const analytics = createAnalytics({ consent: 'granted' })
      analytics.start()

      expect(analytics.getAttribution().fbc).toBe(
        'fb.1.1700000000000.FROMPIXEL',
      )
    })
  })
})
