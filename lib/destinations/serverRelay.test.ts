// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { AnalyticsConfig } from '../core/types.js'
import { createTrackHandler } from '../server/createTrackHandler.js'
import type { RelayPayload } from './serverRelay.js'

const PIXEL_ID = '1234567890'

const sendBeacon = vi.fn<(url: string, body: string) => boolean>(() => true)
const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
  () => Promise.resolve(new Response(null)),
)

const beacons = () =>
  sendBeacon.mock.calls.map(([url, body]) => ({
    url,
    payload: JSON.parse(body) as RelayPayload,
  }))

type Fbq = { queue: ArrayLike<unknown>[] }
/** The Pixel's last call, as [command, name, params, { eventID }]. */
const lastPixelCall = () =>
  Array.from((window as Window & { fbq?: Fbq }).fbq?.queue.at(-1) ?? [])

const withRelay = (config: Partial<AnalyticsConfig> = {}) =>
  createAnalytics({
    consent: 'granted',
    server: { endpoint: '/api/track' },
    ...config,
  })

const withPixelAndRelay = (config: Partial<AnalyticsConfig> = {}) =>
  withRelay({ metaPixel: { pixelId: PIXEL_ID, loadScript: false }, ...config })

const clearCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

describe('server relay destination', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'fbq')
    Reflect.deleteProperty(window, '_fbq')
    sessionStorage.clear()
    localStorage.clear()
    history.replaceState({}, '', '/checkout')
    sendBeacon.mockClear()
    sendBeacon.mockReturnValue(true)
    fetchMock.mockClear()
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'sendBeacon')
    vi.unstubAllGlobals()
    clearCookie('_fbp')
    clearCookie('_fbc')
  })

  it('posts each event with the name, params and event ID the Pixel received, so Meta counts it once', () => {
    const analytics = withPixelAndRelay()

    analytics.start()
    analytics.track('purchase', {
      value: 42,
      currency: 'USD',
      items: [{ item_id: 'sku1', quantity: 2 }],
    })

    const [, pixelName, pixelParams, { eventID }] = lastPixelCall() as [
      string,
      string,
      unknown,
      { eventID: string },
    ]
    expect(beacons()).toEqual([
      {
        url: '/api/track',
        payload: {
          v: 1,
          eventName: pixelName,
          eventId: eventID,
          customData: pixelParams,
          eventSourceUrl: 'http://localhost:3000/checkout',
          consent: { adUserData: 'granted' },
          userData: {},
        },
      },
    ])
    expect(pixelName).toBe('Purchase')
  })

  it('is accepted by createTrackHandler, which sends Meta the Pixel’s event name and ID', async () => {
    const analytics = withPixelAndRelay()
    const handle = createTrackHandler({
      allowedOrigins: ['http://localhost:3000'],
      meta: { pixelId: PIXEL_ID, accessToken: 'token' },
    })
    fetchMock.mockResolvedValueOnce(Response.json({ events_received: 1 }))

    analytics.start()
    analytics.track('add_to_cart', { value: 9, currency: 'EUR' })
    const response = await handle(
      new Request('http://localhost:3000/api/track', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'user-agent': 'Mozilla/5.0',
        },
        body: sendBeacon.mock.calls[0][1],
      }),
    )

    const [, pixelName, , { eventID }] = lastPixelCall() as [
      string,
      string,
      unknown,
      { eventID: string },
    ]
    const [, init] = fetchMock.mock.calls[0]
    expect(response.status).toBe(204)
    expect(JSON.parse(String(init.body)).data[0]).toMatchObject({
      event_name: pixelName,
      event_id: eventID,
      custom_data: { value: 9, currency: 'EUR' },
    })
  })

  it('sends the identified user and Meta’s browser IDs with every event, including a sign-in after start', () => {
    history.replaceState({}, '', '/landing?fbclid=click1')
    document.cookie = '_fbp=fb.1.1700000000000.123'
    const analytics = withRelay()

    analytics.identify('user-42', { email: 'ada@example.com' })
    analytics.start()
    analytics.track('view_item')
    analytics.reset()
    analytics.track('logout')
    analytics.identify('user-7', { phone: '+44 7700 900123' })
    analytics.track('login')

    const [viewItem, logout, login] = beacons().map(
      ({ payload }) => payload.userData,
    )
    expect(viewItem).toEqual({
      externalId: 'user-42',
      email: 'ada@example.com',
      fbc: expect.stringMatching(/^fb\.1\.\d+\.click1$/),
      fbp: 'fb.1.1700000000000.123',
    })
    expect(logout).not.toHaveProperty('externalId')
    expect(logout).not.toHaveProperty('email')
    expect(login).toMatchObject({
      externalId: 'user-7',
      phone: '+44 7700 900123',
    })
  })

  it('sends nothing without consent to share user data with ad platforms, and starts once it is granted', () => {
    const analytics = withRelay({ consent: 'denied' })

    analytics.start()
    analytics.track('sign_up')
    expect(sendBeacon).not.toHaveBeenCalled()

    analytics.consent.update({ ads: 'granted' })
    analytics.track('sign_up')
    expect(beacons()).toHaveLength(1)

    analytics.consent.update({ adUserData: 'denied' })
    analytics.track('sign_up')
    expect(beacons()).toHaveLength(1)
  })

  describe('page views', () => {
    it('are not relayed while the Pixel sends its own, which carry no event ID', () => {
      const analytics = withPixelAndRelay()

      analytics.start()
      analytics.page()

      expect(sendBeacon).not.toHaveBeenCalled()
    })

    it('are relayed as PageView with the Pixel’s event ID when page views are manual', () => {
      const analytics = withPixelAndRelay({
        metaPixel: {
          pixelId: PIXEL_ID,
          loadScript: false,
          pageViews: 'manual',
        },
      })

      analytics.start()
      analytics.page()

      const [, name, , { eventID }] = lastPixelCall() as [
        string,
        string,
        unknown,
        { eventID: string },
      ]
      expect(beacons()[0].payload).toMatchObject({
        eventName: name,
        eventId: eventID,
        customData: {},
      })
      expect(name).toBe('PageView')
    })

    it('are relayed when there is no Pixel on the page', () => {
      const analytics = withRelay()

      analytics.start()
      analytics.page()

      expect(beacons()[0].payload.eventName).toBe('PageView')
    })
  })

  it.each([
    [
      'the browser has no sendBeacon',
      () => Reflect.deleteProperty(navigator, 'sendBeacon'),
    ],
    ['the beacon queue is full', () => sendBeacon.mockReturnValue(false)],
  ])('falls back to a keepalive fetch when %s', (_case, arrange) => {
    arrange()
    const analytics = withRelay()

    analytics.start()
    analytics.track('sign_up')

    expect(fetchMock).toHaveBeenCalledWith('/api/track', {
      method: 'POST',
      body: expect.stringContaining('"eventName":"CompleteRegistration"'),
      keepalive: true,
      mode: 'no-cors',
    })
  })

  it('reports a failed request without breaking the app', async () => {
    sendBeacon.mockReturnValue(false)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const onError = vi.fn()
    const analytics = withRelay({ onError })

    analytics.start()
    analytics.track('sign_up')

    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'destination_failed' }),
      ),
    )
  })

  it.each(['api/track', '//evil.test/track', 'http://shop.test/api/track'])(
    'rejects the endpoint %j when the instance is created',
    endpoint => {
      expect(() => withRelay({ server: { endpoint } })).toThrow(
        /server\.endpoint must be a path on your site/,
      )
    },
  )

  it('accepts an https endpoint on another origin', () => {
    const analytics = withRelay({
      server: { endpoint: 'https://collect.shop.test/track' },
    })

    analytics.start()
    analytics.track('sign_up')

    expect(beacons()[0].url).toBe('https://collect.shop.test/track')
  })
})
