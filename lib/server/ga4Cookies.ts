import { parseCookie } from '../shared/cookies.js'

/**
 * The GA4 client and session IDs from the browser's `_ga` and `_ga_<stream>` cookies, as sent to your server in the
 * `Cookie` header. Needed for Measurement Protocol events to join the visitor's existing GA4 session.
 */
export const readGa4Cookies = ({
  cookieHeader,
  measurementId,
}: {
  cookieHeader: string
  measurementId: string
}): { clientId?: string; sessionId?: string } => {
  // _ga = GA1.1.<random>.<first visit timestamp>; the client ID is the last two parts.
  const clientId = /^GA\d\.\d\.(\d+\.\d+)$/.exec(
    parseCookie(cookieHeader, '_ga') ?? '',
  )?.[1]

  // _ga_<stream> = GS1.1.<session id>.… (older) or GS2.1.s<session id>$o…$g… (current).
  const streamCookie =
    parseCookie(cookieHeader, `_ga_${measurementId.replace(/^G-/, '')}`) ?? ''
  const sessionId =
    /^GS1\.\d\.(\d+)\./.exec(streamCookie)?.[1] ??
    /^GS2\.\d\.s(\d+)/.exec(streamCookie)?.[1]

  return {
    ...(clientId && { clientId }),
    ...(sessionId && { sessionId }),
  }
}
