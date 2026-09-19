// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'

const CONTAINER_SRC = 'https://www.googletagmanager.com/gtm.js?id=GTM-TEST1'

const readDataLayer = () =>
  (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer

const isArguments = (entry: unknown) =>
  Object.prototype.toString.call(entry) === '[object Arguments]'

/** Objects pushed for GTM triggers, without the gtag() Consent Mode commands. */
const pushedObjects = () => (readDataLayer() ?? []).filter(e => !isArguments(e))

const gtagCommands = () =>
  (readDataLayer() ?? [])
    .filter(isArguments)
    .map(entry => Array.from(entry as unknown as ArrayLike<unknown>))

const containerScripts = () =>
  Array.from(document.scripts).filter(script => script.src === CONTAINER_SRC)

describe('GTM destination', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer')
    Reflect.deleteProperty(window, 'gtag')
    document.head.innerHTML = ''
  })

  it('pushes each event to the dataLayer with its params and a shared event id', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1' },
    })

    analytics.start()
    analytics.track('sign_up', { method: 'google' })

    expect(readDataLayer()?.at(-1)).toEqual({
      method: 'google',
      event: 'sign_up',
      event_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    })
  })

  it('does not let params overwrite the event name or event id', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1' },
    })

    analytics.start()
    analytics.track('purchase', { event: 'spoofed', event_id: 'spoofed' })

    expect(readDataLayer()?.at(-1)).toMatchObject({ event: 'purchase' })
    expect(readDataLayer()?.at(-1)?.event_id).not.toBe('spoofed')
  })

  it('loads the container once, with the configured CSP nonce', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1' },
      nonce: 'abc123',
    })

    analytics.start()
    analytics.start()
    createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1' },
    }).start()

    expect(containerScripts()).toHaveLength(1)
    expect(containerScripts()[0].getAttribute('nonce')).toBe('abc123')
    expect(containerScripts()[0].async).toBe(true)
    expect(
      readDataLayer()?.filter(entry => entry.event === 'gtm.js'),
    ).toHaveLength(1)
  })

  it('leaves an existing GTM snippet alone', () => {
    const snippet = document.createElement('script')
    snippet.src = CONTAINER_SRC
    document.head.append(snippet)

    createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1' },
    }).start()

    expect(containerScripts()).toHaveLength(1)
    expect(pushedObjects()).toEqual([])
  })

  it('does not load the container when loadScript is false', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
    })

    analytics.start()
    analytics.track('page_ready')

    expect(containerScripts()).toHaveLength(0)
    expect(pushedObjects()).toEqual([
      { event: 'page_ready', event_id: expect.any(String) },
    ])
  })

  it('sets the Consent Mode default before the container loads', () => {
    createAnalytics({
      consent: 'denied',
      gtm: { containerId: 'GTM-TEST1' },
    }).start()

    const layer = readDataLayer() ?? []
    expect(Array.from(layer[0] as unknown as ArrayLike<unknown>)).toEqual([
      'consent',
      'default',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      },
    ])
    expect(layer.findIndex(entry => entry.event === 'gtm.js')).toBe(1)
  })

  it('sends a Consent Mode update when consent changes', () => {
    const analytics = createAnalytics({
      consent: 'denied',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
    })

    analytics.start()
    analytics.consent.update({ analytics: 'granted', ads: 'granted' })

    expect(gtagCommands().at(-1)).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      },
    ])
  })

  it('rejects a malformed container id when the instance is created', () => {
    expect(() =>
      createAnalytics({ consent: 'granted', gtm: { containerId: 'UA-1234' } }),
    ).toThrow(/GTM-XXXXXXX/)
  })

  it('loads the container from a custom domain such as a server-side GTM', () => {
    createAnalytics({
      consent: 'granted',
      gtm: {
        containerId: 'GTM-TEST1',
        scriptUrl: 'https://sgtm.example.com/gtm.js',
      },
    }).start()

    expect(Array.from(document.scripts).map(script => script.src)).toEqual([
      'https://sgtm.example.com/gtm.js?id=GTM-TEST1',
    ])
  })

  it('rejects a non-https script URL when the instance is created', () => {
    expect(() =>
      createAnalytics({
        consent: 'granted',
        gtm: { containerId: 'GTM-TEST1', scriptUrl: 'http://sgtm.test/gtm.js' },
      }),
    ).toThrow(/gtm.scriptUrl must be an https:\/\/ URL/)
  })

  it('pushes identify without traits, and page views with an event id', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
    })

    analytics.start()
    analytics.identify('user-42', { email: 'a@b.com' })
    analytics.page()

    expect(pushedObjects()).toEqual([
      { event: 'identify', user_id: 'user-42' },
      {
        page_location: location.href,
        page_title: document.title,
        event: 'page_view',
        event_id: expect.any(String),
      },
    ])
    expect(JSON.stringify(readDataLayer())).not.toContain('a@b.com')
  })

  it('clears user_id from GTM’s data model on reset', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
    })

    analytics.start()
    analytics.identify('user-42')
    analytics.reset()

    // GTM merges every push into one data model; this reproduces that merge.
    const dataModel = Object.assign({}, ...pushedObjects())
    expect(dataModel).toHaveProperty('user_id', undefined)
    expect(readDataLayer()?.at(-1)).toEqual({
      event: 'reset',
      user_id: undefined,
    })
  })
})
