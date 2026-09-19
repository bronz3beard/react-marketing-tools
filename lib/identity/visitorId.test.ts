// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { AnalyticsConfig } from '../core/types.js'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const stored = () => localStorage.getItem('rmt:vid')

const started = (config: Partial<AnalyticsConfig> = {}) => {
  const analytics = createAnalytics({ consent: 'granted', ...config })
  analytics.start()
  return analytics
}

describe('visitor ID', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    Reflect.deleteProperty(window, 'dataLayer')
    Reflect.deleteProperty(window, 'gtag')
    document.head.innerHTML = ''
  })

  describe('random (default)', () => {
    it('is undefined without analytics consent, and nothing is stored', async () => {
      const analytics = started({ consent: 'denied' })

      await expect(analytics.getVisitorId()).resolves.toBeUndefined()
      expect(stored()).toBeNull()
    })

    it('stays the same across page loads for a consenting visitor', async () => {
      const first = await started().getVisitorId()
      const afterReload = await started().getVisitorId()

      expect(first).toMatch(UUID)
      expect(afterReload).toBe(first)
      expect(stored()).toBe(first)
    })

    it('waits for start(), so a component can ask before the provider starts', async () => {
      const analytics = createAnalytics({ consent: 'granted' })
      const pending = analytics.getVisitorId()
      await Promise.resolve()
      expect(stored()).toBeNull()

      analytics.start()

      await expect(pending).resolves.toMatch(UUID)
    })

    it('keeps a returning visitor’s ID when the banner grants consent after a denied start', async () => {
      const previous = await started().getVisitorId()

      const analytics = started({ consent: 'denied' })
      analytics.consent.update({ analytics: 'granted' })

      await expect(analytics.getVisitorId()).resolves.toBe(previous)
    })

    it('is erased when analytics consent is withdrawn, and a new one is made if it’s granted again', async () => {
      const analytics = started()
      const before = await analytics.getVisitorId()

      analytics.consent.update({ analytics: 'denied' })
      expect(stored()).toBeNull()
      await expect(analytics.getVisitorId()).resolves.toBeUndefined()

      analytics.consent.update({ analytics: 'granted' })
      const after = await analytics.getVisitorId()
      expect(after).toMatch(UUID)
      expect(after).not.toBe(before)
    })

    it('is off with visitorId: false', async () => {
      await expect(
        started({ visitorId: false }).getVisitorId(),
      ).resolves.toBeUndefined()
      expect(stored()).toBeNull()
    })
  })

  describe('fingerprint', () => {
    it('runs only with both analytics and advertising consent, once per page, and is never stored', async () => {
      const fingerprint = vi.fn(() => Promise.resolve('fp-123'))
      const analytics = started({
        consent: 'denied',
        visitorId: { fingerprint },
      })

      analytics.consent.update({ analytics: 'granted' })
      await expect(analytics.getVisitorId()).resolves.toBeUndefined()
      expect(fingerprint).not.toHaveBeenCalled()

      analytics.consent.update({ ads: 'granted' })
      await expect(analytics.getVisitorId()).resolves.toBe('fp-123')
      await expect(analytics.getVisitorId()).resolves.toBe('fp-123')
      expect(fingerprint).toHaveBeenCalledTimes(1)
      expect(stored()).toBeNull()
    })

    it.each([
      ['rejects', () => Promise.reject(new Error('blocked'))],
      [
        'throws',
        () => {
          throw new Error('blocked')
        },
      ],
      ['returns an empty value', () => Promise.resolve('')],
    ])(
      'reports visitor_id_failed and gives no ID when the function %s',
      async (_case, fingerprint) => {
        const onError = vi.fn()
        const analytics = started({
          visitorId: { fingerprint: fingerprint as () => Promise<string> },
          onError,
        })

        await expect(analytics.getVisitorId()).resolves.toBeUndefined()
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'visitor_id_failed' }),
        )
      },
    )

    it('is computed at start when the relay is on, and reaches it as Meta’s external_id once ready', async () => {
      const sendBeacon = vi.fn<(url: string, body: string) => boolean>(
        () => true,
      )
      Object.defineProperty(navigator, 'sendBeacon', {
        value: sendBeacon,
        configurable: true,
      })
      const analytics = started({
        visitorId: { fingerprint: () => Promise.resolve('fp-123') },
        server: { endpoint: '/api/track' },
      })

      analytics.track('sign_up')
      await new Promise(resolve => setTimeout(resolve))
      analytics.track('login')

      const [signUp, login] = sendBeacon.mock.calls.map(
        ([, body]) => JSON.parse(body).userData,
      )
      // Tracked in the same tick as start(), before the fingerprint resolved.
      expect(signUp).toEqual({})
      expect(login).toEqual({ externalId: 'fp-123' })
      Reflect.deleteProperty(navigator, 'sendBeacon')
    })
  })

  it('never reaches Google Analytics or the dataLayer', async () => {
    const analytics = started({
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
      ga4: { measurementId: 'G-TEST1', loadScript: false },
    })
    const visitorId = await analytics.getVisitorId()

    analytics.identify('user-42')
    analytics.track('purchase', { value: 1, currency: 'USD' })
    analytics.page()

    expect(visitorId).toMatch(UUID)
    const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer
    expect(dataLayer?.length).toBeGreaterThan(0)
    expect(
      JSON.stringify(dataLayer, (_key, value: unknown) =>
        // gtag() queues Arguments objects; serialise them as arrays.
        Object.prototype.toString.call(value) === '[object Arguments]'
          ? Array.from(value as ArrayLike<unknown>)
          : value,
      ),
    ).not.toContain(visitorId)
  })

  it.each([
    ['fingerprintjs', 'fingerprintjs'],
    ['a fingerprint that isn’t a function', { fingerprint: 'fp' }],
  ])('rejects %s when the instance is created', (_case, visitorId) => {
    expect(() =>
      createAnalytics({
        consent: 'granted',
        visitorId: visitorId as AnalyticsConfig['visitorId'],
      }),
    ).toThrow(/visitorId must be 'random', false or \{ fingerprint/)
  })
})
