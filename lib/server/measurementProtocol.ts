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
const FIREBASE_APP_ID = /^\d+:\d+:(android|ios):[0-9a-f]+$/
const APP_INSTANCE_ID = /^[0-9a-f]{32}$/i
const MAX_EVENTS = 25

export type MeasurementProtocolEvent = { name: string; params?: EventParams }

/** A GA4 web stream: events join the visitor's browser client. */
type WebStream = {
  measurementId: string
  /** The visitor's GA4 client ID, from the `_ga` cookie (see `readGa4Cookies`). */
  clientId: string
  firebaseAppId?: never
  appInstanceId?: never
}

/** A GA4 app stream (iOS or Android, through Firebase): events join the app installation. */
type AppStream = {
  /** The Firebase App ID, e.g. `1:1234567890:android:321abc456def7890`, shown on the app stream's details. */
  firebaseAppId: string
  /** The installation's ID from the Firebase SDK: `getAppInstanceId()` on Android, `appInstanceID()` on iOS. */
  appInstanceId: string
  measurementId?: never
  clientId?: never
}

export type MeasurementProtocolOptions = (WebStream | AppStream) & {
  /** Created on the same stream. Keep it on your server: Google says it must not be exposed in client-side code. */
  apiSecret: string
  /** The GA4 session ID, from the `_ga_<stream>` cookie or the Firebase SDK, so events join that session. */
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

const assertValidAppStream = ({
  firebaseAppId,
  appInstanceId,
}: {
  firebaseAppId?: string
  appInstanceId?: string
}) => {
  if (!FIREBASE_APP_ID.test(firebaseAppId ?? '')) {
    throw invalidArgument(
      `firebaseAppId must look like "1:1234567890:android:321abc456def7890" (received ${JSON.stringify(firebaseAppId)})`,
    )
  }
  if (!APP_INSTANCE_ID.test(appInstanceId ?? '')) {
    throw invalidArgument(
      'appInstanceId must be the 32-character ID from the Firebase SDK (getAppInstanceId() on Android, appInstanceID() on iOS)',
    )
  }
}

const assertValidWebStream = ({
  measurementId,
  clientId,
}: {
  measurementId?: string
  clientId?: string
}) => {
  if (!MEASUREMENT_ID.test(measurementId ?? '')) {
    throw invalidArgument(
      `measurementId must look like "G-XXXXXXX" (received ${JSON.stringify(measurementId)})`,
    )
  }
  if (!clientId) {
    throw invalidArgument(
      'clientId is required; read it from the _ga cookie with readGa4Cookies()',
    )
  }
}

const assertValid = (options: MeasurementProtocolOptions) => {
  const { apiSecret, userId, events } = options
  const isApp =
    options.firebaseAppId !== undefined || options.appInstanceId !== undefined
  const isWeb =
    options.measurementId !== undefined || options.clientId !== undefined
  if (isApp && isWeb) {
    throw invalidArgument(
      'pass measurementId and clientId for a web stream, or firebaseAppId and appInstanceId for an app stream, not both',
    )
  }
  if (isApp) assertValidAppStream(options)
  else assertValidWebStream(options)
  if (!apiSecret) throw invalidArgument('apiSecret is required')
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

// A web stream is addressed by measurement ID and client ID; an app stream by Firebase App ID and app instance ID.
const toStreamIds = (options: MeasurementProtocolOptions) =>
  options.firebaseAppId === undefined
    ? {
        param: 'measurement_id',
        id: options.measurementId,
        body: { client_id: options.clientId },
      }
    : {
        param: 'firebase_app_id',
        id: options.firebaseAppId,
        body: { app_instance_id: options.appInstanceId },
      }

/** Sends events to GA4 from your server, e.g. a purchase confirmed by a payment webhook or an event relayed from an app. */
export const sendMeasurementProtocolEvent = async (
  options: MeasurementProtocolOptions,
): Promise<MeasurementProtocolResult> => {
  assertValid(options)
  const {
    apiSecret,
    sessionId,
    userId,
    events,
    consent,
    validate = false,
    region = 'global',
  } = options
  const streamIds = toStreamIds(options)

  const warnings: string[] = []
  const body = {
    ...streamIds.body,
    ...(userId && { user_id: userId }),
    ...(consent && { consent: toPayloadConsent(consent) }),
    events: events.map(event => toPayloadEvent({ event, sessionId, warnings })),
  }

  const url = new URL(
    validate ? '/debug/mp/collect' : '/mp/collect',
    ORIGINS[region],
  )
  url.searchParams.set(streamIds.param, streamIds.id)
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
