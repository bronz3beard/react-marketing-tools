// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { buildConfig } from '../buildConfig'
import { trackAnalyticsEvent } from './analyticsEventService'

describe('trackAnalyticsEvent', () => {
  let dataLayer: unknown[]

  beforeEach(() => {
    dataLayer = []
    Object.assign(window, { dataLayer })
    buildConfig({ appName: 'demo', appSessionCookieName: 'APP_SESSION' })
  })

  // Characterization test: pins the 0.4.3 behaviour so the fix in VS-04 (batch B3) is a visible, deliberate change.
  it('rejects with the default config and pushes nothing (known defect F1 — fixed in VS-04)', async () => {
    await expect(
      trackAnalyticsEvent({
        data: { count: 1 },
        eventNameInfo: {
          eventName: 'click',
          actionPrefix: 'I',
          globalAppEvent: 'AUTHENTICATED',
        },
        analyticsType: 'DATALAYER_PUSH',
      }),
    ).rejects.toThrow('if you want serverLocationInfo')

    expect(dataLayer).toHaveLength(0)
  })
})
