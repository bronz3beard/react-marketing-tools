// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { buildConfig } from '../buildConfig'
import type { TrackAnalyticsEventOptions } from '../types'
import { trackAnalyticsEvent } from './analyticsEventService'

const clickEvent: TrackAnalyticsEventOptions = {
  data: { count: 1 },
  eventNameInfo: {
    eventName: 'click',
    actionPrefix: 'I',
    globalAppEvent: 'AUTHENTICATED',
  },
  analyticsType: 'DATALAYER_PUSH',
}

const readDataLayer = () =>
  (window as Window & { dataLayer?: unknown[] }).dataLayer

describe('trackAnalyticsEvent', () => {
  beforeEach(() => {
    Object.assign(window, { dataLayer: [] })
    buildConfig({ appName: 'demo', appSessionCookieName: 'APP_SESSION' })
  })

  // Regression for defect F1: 0.4.3 rejected every event unless server location lookup was configured.
  it('delivers the event to the dataLayer with the default config', async () => {
    await trackAnalyticsEvent(clickEvent)

    expect(readDataLayer()).toHaveLength(1)
    expect(readDataLayer()?.[0]).toMatchObject({ event: 'I_CLICK' })
  })

  it('still rejects when server location is enabled without an IP_INFO_TOKEN', async () => {
    buildConfig({
      appName: 'demo',
      appSessionCookieName: 'APP_SESSION',
      withServerLocationInfo: true,
    })

    await expect(trackAnalyticsEvent(clickEvent)).rejects.toThrow(
      'if you want serverLocationInfo',
    )
    expect(readDataLayer()).toHaveLength(0)
  })

  // Regression for defect F10: 0.4.3 threw a TypeError when the GTM snippet had not created window.dataLayer.
  it('creates window.dataLayer when it does not exist yet', async () => {
    Reflect.deleteProperty(window, 'dataLayer')

    await trackAnalyticsEvent({ ...clickEvent, dataLayerCheck: true })

    expect(readDataLayer()).toHaveLength(1)
  })

  it('skips an event already in the dataLayer when dataLayerCheck is on', async () => {
    await trackAnalyticsEvent({ ...clickEvent, dataLayerCheck: true })
    await trackAnalyticsEvent({ ...clickEvent, dataLayerCheck: true })

    expect(readDataLayer()).toHaveLength(1)
  })
})
