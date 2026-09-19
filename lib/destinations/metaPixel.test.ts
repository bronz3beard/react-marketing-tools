// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { AnalyticsConfig, MetaPixelConfig } from '../core/types.js'

const PIXEL_ID = '1234567890'
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

type Fbq = { queue: unknown[]; disablePushState?: boolean }
const readFbq = () => (window as Window & { fbq?: Fbq }).fbq

/** Every fbq() call queued by Meta's base-code stub, as plain arrays. */
const fbqCalls = () =>
  (readFbq()?.queue ?? []).map(entry => Array.from(entry as ArrayLike<unknown>))

const pixelScripts = () =>
  Array.from(document.scripts).filter(script => script.src === SCRIPT_SRC)

const withPixel = (
  metaPixel: Partial<MetaPixelConfig> = {},
  config: Partial<AnalyticsConfig> = {},
) =>
  createAnalytics({
    consent: 'granted',
    metaPixel: { pixelId: PIXEL_ID, ...metaPixel },
    ...config,
  })

describe('Meta Pixel destination', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'fbq')
    Reflect.deleteProperty(window, '_fbq')
    Reflect.deleteProperty(window, 'dataLayer')
    document.head.innerHTML = ''
  })

  it('loads fbevents.js once and initialises the pixel before the automatic PageView', () => {
    const analytics = withPixel({}, { nonce: 'n0nce' })

    analytics.start()
    analytics.start()
    withPixel().start()

    expect(pixelScripts()).toHaveLength(1)
    expect(pixelScripts()[0].getAttribute('nonce')).toBe('n0nce')
    expect(fbqCalls().slice(0, 2)).toEqual([
      ['init', PIXEL_ID],
      ['track', 'PageView'],
    ])
  })

  it('queues Arguments objects, exactly as Meta’s base code does', () => {
    withPixel().start()

    expect(
      readFbq()?.queue.every(
        entry => Object.prototype.toString.call(entry) === '[object Arguments]',
      ),
    ).toBe(true)
  })

  it('sends GA4 recommended events as Meta standard events, with the event id every destination shares', () => {
    const analytics = withPixel(
      {},
      { gtm: { containerId: 'GTM-TEST1', loadScript: false } },
    )

    analytics.start()
    analytics.track('sign_up', { method: 'google' })

    const dataLayer = (
      window as Window & { dataLayer?: Record<string, unknown>[] }
    ).dataLayer
    const gtmEventId = dataLayer?.find(e => e.event === 'sign_up')?.event_id
    expect(fbqCalls().at(-1)).toEqual([
      'track',
      'CompleteRegistration',
      { method: 'google' },
      { eventID: gtmEventId },
    ])
  })

  it('leaves out events tracked with meta: false, which other destinations still get', () => {
    const analytics = withPixel(
      {},
      { gtm: { containerId: 'GTM-TEST1', loadScript: false } },
    )

    analytics.start()
    const before = fbqCalls().length
    analytics.track('LCP', { value: 1200 }, { meta: false })

    expect(fbqCalls()).toHaveLength(before)
    const dataLayer = (
      window as Window & { dataLayer?: Record<string, unknown>[] }
    ).dataLayer
    expect(dataLayer?.some(entry => entry.event === 'LCP')).toBe(true)
  })

  it('sends other events as custom events', () => {
    const analytics = withPixel()

    analytics.start()
    analytics.track('newsletter_open')

    expect(fbqCalls().at(-1)).toEqual([
      'trackCustom',
      'newsletter_open',
      {},
      { eventID: expect.any(String) },
    ])
  })

  it('maps ecommerce params and applies per-call overrides', () => {
    const analytics = withPixel()

    analytics.start()
    analytics.track('purchase', {
      value: 42,
      currency: 'USD',
      items: [{ item_id: 'sku1', quantity: 2 }],
    })
    analytics.track(
      'lead_form',
      { form: 'demo' },
      { meta: { event: 'Lead', params: { content_category: 'b2b' } } },
    )

    expect(fbqCalls().slice(-2)).toEqual([
      [
        'track',
        'Purchase',
        {
          value: 42,
          currency: 'USD',
          content_ids: ['sku1'],
          contents: [{ id: 'sku1', quantity: 2 }],
          num_items: 2,
          content_type: 'product',
        },
        { eventID: expect.any(String) },
      ],
      [
        'track',
        'Lead',
        { form: 'demo', content_category: 'b2b' },
        { eventID: expect.any(String) },
      ],
    ])
  })

  it('revokes consent before init when sharing data with ad platforms is denied, then follows updates', () => {
    const analytics = withPixel({}, { consent: 'denied' })

    analytics.start()
    analytics.consent.update({ ads: 'granted' })
    analytics.consent.update({ adUserData: 'denied' })

    expect(fbqCalls().slice(0, 2)).toEqual([
      ['consent', 'revoke'],
      ['init', PIXEL_ID],
    ])
    expect(fbqCalls().slice(-2)).toEqual([
      ['consent', 'grant'],
      ['consent', 'revoke'],
    ])
  })

  it('initialises with the user identified before start, for advanced matching', () => {
    const analytics = withPixel()

    analytics.identify('user-42', { email: 'A@B.com ', firstName: 'Ada' })
    analytics.start()

    expect(fbqCalls()[0]).toEqual([
      'init',
      PIXEL_ID,
      { external_id: 'user-42', em: 'A@B.com ', fn: 'Ada' },
    ])
  })

  it('does not re-initialise for a user identified after start (the Pixel ignores a second init)', () => {
    const analytics = withPixel()

    analytics.start()
    analytics.identify('user-42', { email: 'a@b.com' })

    expect(fbqCalls().filter(([command]) => command === 'init')).toEqual([
      ['init', PIXEL_ID],
    ])
  })

  it('sends only manual page views when pageViews is "manual"', () => {
    const analytics = withPixel({ pageViews: 'manual' })

    analytics.start()
    analytics.page()

    expect(readFbq()?.disablePushState).toBe(true)
    expect(fbqCalls()).toEqual([
      ['init', PIXEL_ID],
      ['track', 'PageView', {}, { eventID: expect.any(String) }],
    ])
  })

  it('leaves page views to the Pixel by default', () => {
    const analytics = withPixel()

    analytics.start()
    analytics.page()

    expect(fbqCalls().filter(([, name]) => name === 'PageView')).toHaveLength(1)
  })

  it('reuses base code already on the page without loading fbevents.js again', () => {
    const existing = document.createElement('script')
    existing.src = SCRIPT_SRC
    document.head.append(existing)

    withPixel().start()

    expect(pixelScripts()).toHaveLength(1)
  })

  it('does not load fbevents.js when loadScript is false', () => {
    withPixel({ loadScript: false }).start()

    expect(pixelScripts()).toHaveLength(0)
  })

  it('rejects a non-numeric pixel id when the instance is created', () => {
    expect(() => withPixel({ pixelId: 'fb-123' })).toThrow(/numeric pixel ID/)
  })
})
