// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'

const CONTAINER_SRC = 'https://www.googletagmanager.com/gtm.js?id=GTM-TEST1'

const readDataLayer = () =>
  (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer

const containerScripts = () =>
  Array.from(document.scripts).filter(script => script.src === CONTAINER_SRC)

describe('GTM destination', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer')
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
    expect(readDataLayer()).toEqual([])
  })

  it('does not load the container when loadScript is false', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
    })

    analytics.start()
    analytics.track('page_ready')

    expect(containerScripts()).toHaveLength(0)
    expect(readDataLayer()).toEqual([
      { event: 'page_ready', event_id: expect.any(String) },
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

    expect(readDataLayer()).toEqual([
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
    const dataModel = Object.assign({}, ...(readDataLayer() ?? []))
    expect(dataModel).toHaveProperty('user_id', undefined)
    expect(readDataLayer()?.at(-1)).toEqual({
      event: 'reset',
      user_id: undefined,
    })
  })
})
