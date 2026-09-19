import type { ConsentState, ConsentStatus, ConsentUpdate } from './types.js'

export const CONSENT_KEYS: readonly (keyof ConsentState)[] = [
  'analytics',
  'ads',
  'adUserData',
  'adPersonalization',
]

export const isConsentStatus = (value: unknown): value is ConsentStatus =>
  value === 'granted' || value === 'denied'

/** Every signal follows `consent`, except that Global Privacy Control (an ad opt-out) denies the advertising signals. */
export const initialConsentState = ({
  consent,
  gpc,
}: {
  consent: ConsentStatus
  gpc: boolean
}): ConsentState => {
  const ads = gpc ? 'denied' : consent
  return { analytics: consent, ads, adUserData: ads, adPersonalization: ads }
}

/** `ads` also sets `adUserData` and `adPersonalization`, unless the update gives them explicitly (e.g. TCF-style CMPs). */
export const applyConsentUpdate = (
  state: ConsentState,
  update: ConsentUpdate,
): ConsentState => ({
  analytics: update.analytics ?? state.analytics,
  ads: update.ads ?? state.ads,
  adUserData: update.adUserData ?? update.ads ?? state.adUserData,
  adPersonalization:
    update.adPersonalization ?? update.ads ?? state.adPersonalization,
})

/** Google Consent Mode v2 signals. */
export const toGoogleConsent = (state: ConsentState) => ({
  analytics_storage: state.analytics,
  ad_storage: state.ads,
  ad_user_data: state.adUserData,
  ad_personalization: state.adPersonalization,
})

export const hasDeniedSignal = (state: ConsentState): boolean =>
  Object.values(state).includes('denied')

/** Global Privacy Control: a browser-level "do not sell or share" signal. Absent in browsers that don't support it. */
export const readGlobalPrivacyControl = (): boolean =>
  typeof navigator !== 'undefined' &&
  (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl === true
