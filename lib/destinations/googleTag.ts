// Plumbing shared by the Google destinations (Tag Manager and GA4), which use the same command queue: window.dataLayer.

type Gtag = (...args: unknown[]) => void
type GoogleTagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag }

export const dataLayer = (): unknown[] =>
  ((window as GoogleTagWindow).dataLayer ??= [])

export const hasGtag = (): boolean =>
  typeof (window as GoogleTagWindow).gtag === 'function'

/** The page's `gtag()`, defining Google's official command-queue stub when the page doesn't have one yet. */
export const gtag = (): Gtag =>
  ((window as GoogleTagWindow).gtag ??= function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js only processes Arguments objects; it ignores arrays.
    dataLayer().push(arguments)
  })

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
