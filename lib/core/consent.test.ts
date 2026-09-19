import { describe, expect, it } from 'vitest'
import {
  applyConsentUpdate,
  hasDeniedSignal,
  initialConsentState,
  toGoogleConsent,
} from './consent.js'
import type { ConsentState } from './types.js'

const denied: ConsentState = {
  analytics: 'denied',
  ads: 'denied',
  adUserData: 'denied',
  adPersonalization: 'denied',
}

describe('initialConsentState', () => {
  it('applies the configured consent to every purpose', () => {
    expect(initialConsentState({ consent: 'denied', gpc: false })).toEqual(
      denied,
    )
  })

  it('denies only advertising under Global Privacy Control', () => {
    expect(initialConsentState({ consent: 'granted', gpc: true })).toEqual({
      analytics: 'granted',
      ads: 'denied',
      adUserData: 'denied',
      adPersonalization: 'denied',
    })
  })
})

describe('applyConsentUpdate', () => {
  it('carries ads over to the granular advertising signals', () => {
    expect(applyConsentUpdate(denied, { ads: 'granted' })).toEqual({
      analytics: 'denied',
      ads: 'granted',
      adUserData: 'granted',
      adPersonalization: 'granted',
    })
  })

  it('lets explicit granular signals win over ads', () => {
    expect(
      applyConsentUpdate(denied, {
        ads: 'granted',
        adPersonalization: 'denied',
      }),
    ).toMatchObject({ adUserData: 'granted', adPersonalization: 'denied' })
  })

  it('keeps purposes the update leaves out', () => {
    const state = applyConsentUpdate(denied, { analytics: 'granted' })
    expect(applyConsentUpdate(state, {})).toEqual(state)
  })
})

describe('toGoogleConsent', () => {
  it('maps each purpose to its Consent Mode v2 signal', () => {
    expect(
      toGoogleConsent({
        analytics: 'granted',
        ads: 'denied',
        adUserData: 'granted',
        adPersonalization: 'denied',
      }),
    ).toEqual({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'granted',
      ad_personalization: 'denied',
    })
  })
})

describe('hasDeniedSignal', () => {
  it('is true when any purpose is denied', () => {
    expect(hasDeniedSignal(denied)).toBe(true)
    expect(
      hasDeniedSignal({
        analytics: 'granted',
        ads: 'granted',
        adUserData: 'granted',
        adPersonalization: 'granted',
      }),
    ).toBe(false)
  })
})
