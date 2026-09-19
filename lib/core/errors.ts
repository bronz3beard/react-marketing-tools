export type AnalyticsErrorCode =
  | 'invalid_event'
  | 'invalid_param'
  | 'invalid_user_id'
  | 'pii_redacted'
  | 'destination_failed'

/** Every problem the library reports to `onError`, or throws when `debug` is on. */
export class AnalyticsError extends Error {
  readonly code: AnalyticsErrorCode

  constructor(
    code: AnalyticsErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`[react-marketing-tools] ${message}`, options)
    this.name = 'AnalyticsError'
    this.code = code
  }
}
