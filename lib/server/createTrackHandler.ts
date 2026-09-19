import type {
  RelayPayload,
  RelayUserData,
} from '../destinations/serverRelay.js'
import { sendConversionsApiEvent } from './conversionsApi.js'

const MAX_BODY_BYTES = 16 * 1024
const PIXEL_ID = /^\d+$/
const USER_DATA_KEYS = [
  'externalId',
  'email',
  'phone',
  'firstName',
  'lastName',
  'fbc',
  'fbp',
] as const satisfies readonly (keyof RelayUserData)[]

export type TrackHandlerOptions = {
  /** Sites allowed to send events, e.g. `['https://shop.example.com']`. Other origins get 403. */
  allowedOrigins: string[]
  meta: {
    pixelId: string
    /** Keep it on your server, e.g. `process.env.META_CAPI_TOKEN`. */
    accessToken: string
    /** From Events Manager → Test events, to see the events there. Remove it in production. */
    testEventCode?: string
    graphApiVersion?: string
  }
  /** Receives Meta's rejections and network failures. Defaults to `console.error`. */
  onError?: (error: Error) => void
}

const invalidOption = (message: string) =>
  new TypeError(`[react-marketing-tools] createTrackHandler: ${message}`)

const assertValidOptions = ({ allowedOrigins, meta }: TrackHandlerOptions) => {
  if (allowedOrigins.length === 0) {
    throw invalidOption(
      "allowedOrigins needs at least one origin, e.g. 'https://shop.example.com'",
    )
  }
  for (const origin of allowedOrigins) {
    if (!URL.canParse(origin) || new URL(origin).origin !== origin) {
      throw invalidOption(
        `allowedOrigins entries must be origins such as 'https://shop.example.com', without a path or trailing slash (received ${JSON.stringify(origin)})`,
      )
    }
  }
  if (!PIXEL_ID.test(meta.pixelId)) {
    throw invalidOption(
      `meta.pixelId must be the numeric pixel ID (received ${JSON.stringify(meta.pixelId)})`,
    )
  }
  if (!meta.accessToken) throw invalidOption('meta.accessToken is required')
}

const reply = (status: number, message?: string) =>
  new Response(message, { status })

/** The body as text, or undefined when it's over the limit. Read as a stream, so an oversized body is never buffered. */
const readBody = async (request: Request): Promise<string | undefined> => {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return undefined
  }
  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      return undefined
    }
    text += decoder.decode(value, { stream: true })
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isPageUrl = (value: unknown): value is string =>
  typeof value === 'string' &&
  URL.canParse(value) &&
  ['http:', 'https:'].includes(new URL(value).protocol)

/** The relay body checked field by field (it comes from the browser); undefined when anything is off. */
const parsePayload = (text: string): RelayPayload | undefined => {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isRecord(data) || data.v !== 1) return undefined

  const { eventName, eventId, customData, eventSourceUrl, consent, userData } =
    data
  if (
    !isNonEmptyString(eventName) ||
    !isNonEmptyString(eventId) ||
    !isRecord(customData) ||
    !isPageUrl(eventSourceUrl) ||
    !isRecord(consent) ||
    (consent.adUserData !== 'granted' && consent.adUserData !== 'denied') ||
    !isRecord(userData) ||
    USER_DATA_KEYS.some(
      key => userData[key] !== undefined && typeof userData[key] !== 'string',
    )
  ) {
    return undefined
  }

  return {
    v: 1,
    eventName,
    eventId,
    customData,
    eventSourceUrl,
    consent: { adUserData: consent.adUserData },
    // Only the fields the page may set: the IP address and user agent come from the request itself.
    userData: Object.fromEntries(
      USER_DATA_KEYS.filter(key => userData[key] !== undefined).map(key => [
        key,
        userData[key],
      ]),
    ),
  }
}

/**
 * A Web-standard `(Request) => Response` endpoint for the `server` destination: it forwards each relayed Pixel event to
 * the Meta Conversions API with the same event ID, so Meta counts it once. Events are never forwarded to GA4, which
 * can't deduplicate them.
 */
export const createTrackHandler = (
  options: TrackHandlerOptions,
): ((request: Request) => Promise<Response>) => {
  assertValidOptions(options)
  const { meta, onError = console.error } = options
  const allowedOrigins = new Set(options.allowedOrigins)

  return async request => {
    if (request.method !== 'POST') {
      return new Response('Use POST', {
        status: 405,
        headers: { allow: 'POST' },
      })
    }
    const origin = request.headers.get('origin')
    if (!origin || !allowedOrigins.has(origin)) {
      return reply(403, 'Origin not allowed')
    }
    const body = await readBody(request)
    if (body === undefined) return reply(413, 'Body too large')
    const payload = parsePayload(body)
    if (!payload) return reply(400, 'Invalid event')
    const userAgent = request.headers.get('user-agent')
    if (!userAgent) return reply(400, 'Missing User-Agent')
    // The page only relays with this consent; checked again because the body comes from the browser.
    if (payload.consent.adUserData !== 'granted') return reply(204)

    try {
      const result = await sendConversionsApiEvent({
        ...meta,
        events: [
          {
            eventName: payload.eventName,
            eventId: payload.eventId,
            eventSourceUrl: payload.eventSourceUrl,
            userData: {
              ...payload.userData,
              // Behind a proxy or CDN, the first address is the visitor's.
              clientIpAddress: request.headers
                .get('x-forwarded-for')
                ?.split(',')[0]
                .trim(),
              clientUserAgent: userAgent,
            },
            customData: payload.customData,
          },
        ],
      })
      if (result.ok) return reply(204)
      onError(
        new Error(
          `[react-marketing-tools] createTrackHandler: Meta rejected "${payload.eventName}" (HTTP ${result.status})`,
          { cause: result.body },
        ),
      )
    } catch (cause) {
      onError(
        new Error(
          `[react-marketing-tools] createTrackHandler: could not send "${payload.eventName}" to Meta`,
          { cause },
        ),
      )
    }
    return reply(502, 'Meta did not accept the event')
  }
}
