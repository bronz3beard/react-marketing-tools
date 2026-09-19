// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { Ga4Config } from '../core/types.js'

const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=G-TEST1'

type Ga4Window = Window & { dataLayer?: unknown[]; gtag?: unknown }

const isArguments = (entry: unknown) =>
  Object.prototype.toString.call(entry) === '[object Arguments]'

/** Every gtag() command queued on the dataLayer, as plain arrays. */
const gtagCalls = () =>
  ((window as Ga4Window).dataLayer ?? [])
    .filter(isArguments)
    .map(entry => Array.from(entry as ArrayLike<unknown>))

const ALL_GRANTED = {
  analytics_storage: 'granted',
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
}

const gtagScripts = () =>
  Array.from(document.scripts).filter(script => script.src === GTAG_SRC)

const startedGa4 = (ga4: Partial<Ga4Config> = {}) => {
  const analytics = createAnalytics({
    consent: 'granted',
    ga4: { measurementId: 'G-TEST1', ...ga4 },
  })
  analytics.start()
  return analytics
}

describe('GA4 destination', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer')
    Reflect.deleteProperty(window, 'gtag')
    document.head.innerHTML = ''
    // Attribution persists campaign touches for the session; each test starts from a fresh visit.
    localStorage.clear()
    sessionStorage.clear()
  })

  it('loads gtag.js once and queues js then config, as Arguments objects', () => {
    const analytics = startedGa4()
    analytics.start()

    expect(gtagScripts()).toHaveLength(1)
    expect(gtagCalls()).toEqual([
      ['consent', 'default', ALL_GRANTED],
      ['js', expect.any(Date)],
      ['config', 'G-TEST1', {}],
    ])
    expect((window as Ga4Window).dataLayer?.every(isArguments)).toBe(true)
  })

  it('sends tracked events as GA4 events', () => {
    const analytics = startedGa4()

    analytics.track('purchase', { value: 42, currency: 'USD' })

    expect(gtagCalls().at(-1)).toEqual([
      'event',
      'purchase',
      { value: 42, currency: 'USD' },
    ])
  })

  it('sets and clears the GA4 user id', () => {
    const analytics = startedGa4()

    analytics.identify('user-42', { email: 'a@b.com' })
    analytics.reset()

    expect(gtagCalls().slice(-2)).toEqual([
      ['set', { user_id: 'user-42' }],
      ['set', { user_id: null }],
    ])
  })

  it('leaves page views to GA4 by default', () => {
    const analytics = startedGa4()

    analytics.page()

    expect(gtagCalls()).not.toContainEqual(
      expect.arrayContaining(['page_view']),
    )
  })

  it('sends only manual page views when pageViews is "manual"', () => {
    const analytics = startedGa4({ pageViews: 'manual' })

    analytics.page()

    expect(gtagCalls()).toContainEqual([
      'config',
      'G-TEST1',
      { send_page_view: false },
    ])
    expect(gtagCalls().at(-1)).toEqual([
      'event',
      'page_view',
      { page_location: location.href, page_title: document.title },
    ])
  })

  it('reuses a gtag snippet already on the page, for any stream, without loading gtag.js again', () => {
    const snippetGtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params -- mirrors Google's snippet, which queues Arguments objects.
      ;((window as Ga4Window).dataLayer ??= []).push(arguments)
    }
    Object.assign(window, { gtag: snippetGtag })
    const snippetScript = document.createElement('script')
    snippetScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-OTHER'
    document.head.append(snippetScript)

    startedGa4()

    expect(document.scripts).toHaveLength(1)
    expect((window as Ga4Window).gtag).toBe(snippetGtag)
    expect(gtagCalls()).toEqual([
      ['consent', 'default', ALL_GRANTED],
      ['config', 'G-TEST1', {}],
    ])
  })

  // Regression: GTM's Consent Mode default defines window.gtag first; GA4 must still load its library.
  it('loads gtag.js when Tag Manager is configured too', () => {
    createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
      ga4: { measurementId: 'G-TEST1' },
    }).start()

    expect(gtagScripts()).toHaveLength(1)
    expect(gtagCalls()).toContainEqual(['js', expect.any(Date)])
  })

  it('does not load gtag.js when loadScript is false', () => {
    startedGa4({ loadScript: false })

    expect(gtagScripts()).toHaveLength(0)
  })

  it('routes hits to a server container and adds event_id for deduplication', () => {
    const analytics = startedGa4({
      serverContainerUrl: 'https://sgtm.example.com',
    })

    analytics.track('purchase', { value: 42 })

    expect(gtagCalls()).toContainEqual([
      'config',
      'G-TEST1',
      { server_container_url: 'https://sgtm.example.com' },
    ])
    expect(gtagCalls().at(-1)).toEqual([
      'event',
      'purchase',
      { value: 42, event_id: expect.any(String) },
    ])
  })

  it('never adds campaign params to GA4 events, which reads them from page_location itself', () => {
    history.replaceState({}, '', '/?utm_source=news&gclid=abc')
    const analytics = startedGa4()

    analytics.track('sign_up', { method: 'google' })
    history.replaceState({}, '', '/')

    expect(gtagCalls().at(-1)).toEqual([
      'event',
      'sign_up',
      { method: 'google' },
    ])
  })

  it('shares one dataLayer with Google Tag Manager', () => {
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
      ga4: { measurementId: 'G-TEST1', loadScript: false },
    })

    analytics.start()
    analytics.track('sign_up', { method: 'google' })

    expect((window as Ga4Window).dataLayer).toContainEqual(
      expect.objectContaining({ event: 'sign_up', method: 'google' }),
    )
    expect(gtagCalls()).toContainEqual([
      'event',
      'sign_up',
      { method: 'google' },
    ])
  })

  it.each([
    [{ measurementId: 'UA-1234' }, /G-XXXXXXX/],
    [
      { measurementId: 'G-TEST1', serverContainerUrl: 'http://sgtm.test' },
      /https:\/\/ URL/,
    ],
    [
      { measurementId: 'G-TEST1', serverContainerUrl: 'not a url' },
      /https:\/\/ URL/,
    ],
  ])(
    'rejects an invalid config when the instance is created: %j',
    (ga4, message) => {
      expect(() => createAnalytics({ consent: 'granted', ga4 })).toThrow(
        message,
      )
    },
  )
})

describe('GA4 Consent Mode v2', () => {
  const setGlobalPrivacyControl = (value: boolean) =>
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value,
      configurable: true,
    })

  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer')
    Reflect.deleteProperty(window, 'gtag')
    document.head.innerHTML = ''
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'globalPrivacyControl')
  })

  const started = (
    config: Omit<Parameters<typeof createAnalytics>[0], 'ga4'>,
  ) => {
    const analytics = createAnalytics({
      ...config,
      ga4: { measurementId: 'G-TEST1', loadScript: false },
    })
    analytics.start()
    return analytics
  }

  it('denies every signal by default, waiting for the visitor’s choice, before the config', () => {
    started({ consent: 'denied' })

    expect(gtagCalls().slice(0, 3)).toEqual([
      [
        'consent',
        'default',
        {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500,
        },
      ],
      ['js', expect.any(Date)],
      ['config', 'G-TEST1', {}],
    ])
  })

  it('maps analytics and ads to the four Consent Mode signals on update', () => {
    const analytics = started({ consent: 'denied' })

    analytics.consent.update({ analytics: 'granted', ads: 'granted' })

    expect(gtagCalls().at(-1)).toEqual(['consent', 'update', ALL_GRANTED])
  })

  it('lets a granular signal override ads', () => {
    const analytics = started({ consent: 'denied' })

    analytics.consent.update({ ads: 'granted', adUserData: 'denied' })

    expect(gtagCalls().at(-1)).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'granted',
        ad_user_data: 'denied',
        ad_personalization: 'granted',
      },
    ])
  })

  it('starts advertising denied under Global Privacy Control, until the visitor explicitly allows it', () => {
    setGlobalPrivacyControl(true)
    const analytics = started({ consent: 'granted' })

    expect(gtagCalls()[0]).toEqual([
      'consent',
      'default',
      {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      },
    ])

    analytics.consent.update({ ads: 'granted' })
    expect(gtagCalls().at(-1)).toEqual(['consent', 'update', ALL_GRANTED])
  })

  it('ignores Global Privacy Control when respectGpc is false', () => {
    setGlobalPrivacyControl(true)
    started({ consent: 'granted', respectGpc: false })

    expect(gtagCalls()[0]).toEqual(['consent', 'default', ALL_GRANTED])
  })

  it('uses a custom wait for the consent update', () => {
    createAnalytics({
      consent: 'denied',
      ga4: { measurementId: 'G-TEST1', loadScript: false, waitForUpdate: 2000 },
    }).start()

    expect(gtagCalls()[0][2]).toMatchObject({ wait_for_update: 2000 })
  })
})
