// Plumbing shared by the Google destinations (Tag Manager and GA4), which use the same command queue: window.dataLayer.

import { hasDeniedSignal, toGoogleConsent } from '../core/consent.js'
import type { ConsentState } from '../core/types.js'

type Gtag = (...args: unknown[]) => void
type GoogleTagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag }

export const dataLayer = (): unknown[] =>
  ((window as GoogleTagWindow).dataLayer ??= [])

/**
 * Whether the page already loads the gtag.js library (any stream, Google- or first-party-hosted). Checked by script rather
 * than by `window.gtag`, because the Consent Mode default defines the gtag stub before any library loads.
 */
export const isGtagLibraryOnPage = (): boolean =>
  Array.from(document.scripts).some(
    script =>
      URL.canParse(script.src) &&
      new URL(script.src).pathname.endsWith('/gtag/js'),
  )

/** The page's `gtag()`, defining Google's official command-queue stub when the page doesn't have one yet. */
export const gtag = (): Gtag =>
  ((window as GoogleTagWindow).gtag ??= function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js only processes Arguments objects; it ignores arrays.
    dataLayer().push(arguments)
  })

/**
 * Consent Mode v2 default. It must be queued before any config or container load. When a signal starts denied, tags
 * wait `waitForUpdate` ms for the visitor's choice before firing.
 */
export const setDefaultConsent = ({
  consent,
  waitForUpdate,
}: {
  consent: ConsentState
  waitForUpdate: number
}): void => {
  gtag()('consent', 'default', {
    ...toGoogleConsent(consent),
    ...(hasDeniedSignal(consent) ? { wait_for_update: waitForUpdate } : {}),
  })
}

export const updateConsent = (consent: ConsentState): void => {
  gtag()('consent', 'update', toGoogleConsent(consent))
}

/** Parses an option that must be an https:// URL, failing fast with the option's name. */
export const toHttpsUrl = (value: string, option: string): URL => {
  const url = URL.canParse(value) ? new URL(value) : undefined
  if (url?.protocol !== 'https:') {
    throw new Error(
      `[react-marketing-tools] ${option} must be an https:// URL (received ${JSON.stringify(value)}).`,
    )
  }
  return url
}
