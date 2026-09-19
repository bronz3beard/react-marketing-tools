import type { EventParams } from '../core/types.js'
import { redactPii } from '../core/validate.js'
import { type ConversionsApiUserData, toMetaUserData } from './normalize.js'

/** Graph API version used unless a call passes `graphApiVersion`. */
export const META_GRAPH_API_VERSION = 'v26.0'

const PIXEL_ID = /^\d+$/
const MAX_EVENTS = 1000

export type ConversionsApiEvent = {
  /** A Meta standard event (`Purchase`, `Lead`, …) or a custom name. */
  eventName: string
  /** The Pixel's `eventID` for the same action, so Meta counts it once. */
  eventId?: string
  /** Defaults to now. */
  eventTime?: Date
  /** Defaults to `'website'`. */
  actionSource?:
    | 'website'
    | 'app'
    | 'email'
    | 'phone_call'
    | 'chat'
    | 'physical_store'
    | 'system_generated'
    | 'business_messaging'
    | 'other'
  /** Required for website events: the page URL. */
  eventSourceUrl?: string
  userData: ConversionsApiUserData
  /** `value`, `currency`, `content_ids`, `contents`… */
  customData?: EventParams
}

export type ConversionsApiOptions = {
  pixelId: string
  /** Keep it on your server, e.g. `process.env.META_CAPI_TOKEN`. */
  accessToken: string
  events: ConversionsApiEvent[]
  /** From Events Manager → Test events, to see the events there. Remove it in production. */
  testEventCode?: string
  graphApiVersion?: string
}

export type ConversionsApiResult = {
  ok: boolean
  status: number
  /** Meta's response, e.g. `{ events_received: 1, fbtrace_id: '…' }` or `{ error: … }`. */
  body: unknown
  /** Personal data removed from `customData`. */
  warnings: string[]
}

const invalidArgument = (message: string) =>
  new TypeError(`[react-marketing-tools] sendConversionsApiEvent: ${message}`)

const assertValid = ({
  pixelId,
  accessToken,
  events,
}: ConversionsApiOptions) => {
  if (!PIXEL_ID.test(pixelId)) {
    throw invalidArgument(
      `pixelId must be the numeric pixel ID (received ${JSON.stringify(pixelId)})`,
    )
  }
  if (!accessToken) throw invalidArgument('accessToken is required')
  if (events.length === 0 || events.length > MAX_EVENTS) {
    throw invalidArgument(
      `send between 1 and ${MAX_EVENTS} events per request (received ${events.length})`,
    )
  }
  for (const event of events) {
    if (!event.eventName)
      throw invalidArgument('every event needs an eventName')
    const isWebsite = (event.actionSource ?? 'website') === 'website'
    if (
      isWebsite &&
      !(event.eventSourceUrl && event.userData.clientUserAgent)
    ) {
      throw invalidArgument(
        `website event "${event.eventName}" needs eventSourceUrl and userData.clientUserAgent`,
      )
    }
  }
}

const toMetaEvent = async ({
  event,
  warnings,
}: {
  event: ConversionsApiEvent
  warnings: string[]
}) => {
  const { params: customData, redactedKeys } = redactPii(event.customData ?? {})
  if (redactedKeys.length > 0) {
    warnings.push(
      `event "${event.eventName}": personal data redacted from customData ${redactedKeys.join(', ')}`,
    )
  }
  return {
    event_name: event.eventName,
    event_time: Math.floor((event.eventTime ?? new Date()).getTime() / 1000),
    action_source: event.actionSource ?? 'website',
    ...(event.eventId && { event_id: event.eventId }),
    ...(event.eventSourceUrl && { event_source_url: event.eventSourceUrl }),
    user_data: await toMetaUserData(event.userData),
    ...(Object.keys(customData).length > 0 && { custom_data: customData }),
  }
}

/** Sends events to Meta from your server. Customer information is normalised and hashed as Meta requires. */
export const sendConversionsApiEvent = async (
  options: ConversionsApiOptions,
): Promise<ConversionsApiResult> => {
  assertValid(options)
  const {
    pixelId,
    accessToken,
    events,
    testEventCode,
    graphApiVersion = META_GRAPH_API_VERSION,
  } = options

  const warnings: string[] = []
  const data = await Promise.all(
    events.map(event => toMetaEvent({ event, warnings })),
  )

  const url = new URL(
    `https://graph.facebook.com/${graphApiVersion}/${pixelId}/events`,
  )
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data,
      ...(testEventCode && { test_event_code: testEventCode }),
    }),
  })
  const body: unknown = await response.json().catch(() => undefined)
  return { ok: response.ok, status: response.status, body, warnings }
}
