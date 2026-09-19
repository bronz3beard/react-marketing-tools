import type { ConsentStatus, EventParams } from '../core/types.js'
import {
  containsEmail,
  findEventNameProblem,
  findParamProblems,
  redactPii,
} from '../core/validate.js'

// https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
const ORIGINS = {
  global: 'https://www.google-analytics.com',
  eu: 'https://region1.google-analytics.com',
} as const
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/
const MAX_EVENTS = 25

export type MeasurementProtocolEvent = { name: string; params?: EventParams }

export type MeasurementProtocolOptions = {
  measurementId: string
  /** Keep it on your server: Google says the API secret must not be exposed in client-side code. */
  apiSecret: string
  /** The visitor's GA4 client ID, from the `_ga` cookie (see `readGa4Cookies`). */
  clientId: string
  /** The visitor's GA4 session ID, from the `_ga_<stream>` cookie, so events join their session. */
  sessionId?: string
  userId?: string
  /** Up to 25 events. Each gets `session_id` and `engagement_time_msec` (1 ms unless the params set it). */
  events: MeasurementProtocolEvent[]
  consent?: { adUserData?: ConsentStatus; adPersonalization?: ConsentStatus }
  /** Send to the validation endpoint instead: nothing is recorded, and GA4's findings come back as `validationMessages`. */
  validate?: boolean
  region?: 'global' | 'eu'
}

export type MeasurementProtocolResult = {
  /** The request was accepted (GA4 accepts malformed payloads too; use `validate` to check them). */
  ok: boolean
  status: number
  /** GA4 limit problems and personal data removed from params. */
  warnings: string[]
  validationMessages?: unknown[]
}

const invalidArgument = (message: string) =>
  new TypeError(
    `[react-marketing-tools] sendMeasurementProtocolEvent: ${message}`,
  )

const assertValid = ({
  measurementId,
  apiSecret,
  clientId,
  userId,
  events,
}: MeasurementProtocolOptions) => {
  if (!MEASUREMENT_ID.test(measurementId)) {
    throw invalidArgument(
      `measurementId must look like "G-XXXXXXX" (received ${JSON.stringify(measurementId)})`,
    )
  }
  if (!apiSecret) throw invalidArgument('apiSecret is required')
  if (!clientId) {
    throw invalidArgument(
      'clientId is required; read it from the _ga cookie with readGa4Cookies()',
    )
  }
  if (userId !== undefined && (!userId || containsEmail(userId))) {
    throw invalidArgument(
      'userId must be your own identifier, not personal data such as an email address',
    )
  }
  if (events.length === 0 || events.length > MAX_EVENTS) {
    throw invalidArgument(
      `send between 1 and ${MAX_EVENTS} events per request (received ${events.length})`,
    )
  }
  for (const { name } of events) {
    const problem = findEventNameProblem(name)
    if (problem) throw invalidArgument(problem)
  }
}

const toPayloadEvent = ({
  event: { name, params = {} },
  sessionId,
  warnings,
}: {
  event: MeasurementProtocolEvent
  sessionId?: string
  warnings: string[]
}) => {
  for (const problem of findParamProblems(params)) {
    warnings.push(`event "${name}" ${problem}`)
  }
  const { params: safeParams, redactedKeys } = redactPii(params)
  if (redactedKeys.length > 0) {
    warnings.push(
      `event "${name}": personal data redacted from ${redactedKeys.join(', ')}`,
    )
  }
  return {
    name,
    params: {
      ...(sessionId && { session_id: sessionId }),
      engagement_time_msec: 1,
      ...safeParams,
    },
  }
}

const toPayloadConsent = ({
  adUserData,
  adPersonalization,
}: NonNullable<MeasurementProtocolOptions['consent']>) => ({
  ...(adUserData && { ad_user_data: adUserData.toUpperCase() }),
  ...(adPersonalization && {
    ad_personalization: adPersonalization.toUpperCase(),
  }),
})

/** Sends events to GA4 from your server, e.g. a purchase confirmed by a payment webhook. */
export const sendMeasurementProtocolEvent = async (
  options: MeasurementProtocolOptions,
): Promise<MeasurementProtocolResult> => {
  assertValid(options)
  const {
    measurementId,
    apiSecret,
    clientId,
    sessionId,
    userId,
    events,
    consent,
    validate = false,
    region = 'global',
  } = options

  const warnings: string[] = []
  const body = {
    client_id: clientId,
    ...(userId && { user_id: userId }),
    ...(consent && { consent: toPayloadConsent(consent) }),
    events: events.map(event => toPayloadEvent({ event, sessionId, warnings })),
  }

  const url = new URL(
    validate ? '/debug/mp/collect' : '/mp/collect',
    ORIGINS[region],
  )
  url.searchParams.set('measurement_id', measurementId)
  url.searchParams.set('api_secret', apiSecret)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!validate) {
    return { ok: response.ok, status: response.status, warnings }
  }

  const { validationMessages = [] } = (await response
    .json()
    .catch(() => ({}))) as { validationMessages?: unknown[] }
  return {
    ok: response.ok && validationMessages.length === 0,
    status: response.status,
    warnings,
    validationMessages,
  }
}
