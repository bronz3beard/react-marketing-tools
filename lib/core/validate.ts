import type { EventParams } from './types.js'

// GA4 collection limits: https://developers.google.com/analytics/devguides/collection/ga4/event-parameters
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,39}$/
const RESERVED_PREFIXES = ['google_', 'ga_', 'firebase_']
const MAX_PARAMS = 25
const DEFAULT_MAX_VALUE_LENGTH = 100
const MAX_VALUE_LENGTH: Record<string, number> = {
  page_location: 1000,
  page_referrer: 420,
  page_title: 300,
}

// Keys whose values are personal data whatever they contain (matched case-insensitively as substrings).
const PII_KEY_PARTS = [
  'email',
  'phone',
  'first_name',
  'last_name',
  'address',
  'password',
]
// Also matches URL-encoded addresses (a%40b.com), e.g. inside page_location.
const EMAIL_SOURCE = String.raw`[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+`

export const REDACTED = '[redacted]'

const nameProblem = (name: string): string | undefined => {
  if (!NAME_PATTERN.test(name)) {
    return 'must start with a letter, contain only letters, digits and underscores, and be at most 40 characters'
  }
  const prefix = RESERVED_PREFIXES.find(reserved =>
    name.toLowerCase().startsWith(reserved),
  )
  return prefix && `must not start with the reserved prefix "${prefix}"`
}

/** Why `name` can't be used as an event name, or `undefined` when it can. */
export const findEventNameProblem = (name: string): string | undefined => {
  const problem = nameProblem(name)
  return problem && `event name "${name}" ${problem}`
}

/** Param problems GA4 would handle by truncating or ignoring; reported, but the event is still sent. */
export const findParamProblems = (params: EventParams): string[] => {
  const keys = Object.keys(params)
  const problems = keys.flatMap(key => {
    const keyProblem = nameProblem(key)
    if (keyProblem) return [`param "${key}" ${keyProblem}`]

    const value = params[key]
    const maxLength = MAX_VALUE_LENGTH[key] ?? DEFAULT_MAX_VALUE_LENGTH
    return typeof value === 'string' && value.length > maxLength
      ? [`param "${key}" is longer than ${maxLength} characters`]
      : []
  })

  return keys.length > MAX_PARAMS
    ? [`has ${keys.length} params; the limit is ${MAX_PARAMS}`, ...problems]
    : problems
}

export const containsEmail = (value: string): boolean =>
  new RegExp(EMAIL_SOURCE, 'i').test(value)

const redactValue = (key: string, value: unknown): unknown => {
  const isScalar = typeof value === 'string' || typeof value === 'number'
  if (
    isScalar &&
    PII_KEY_PARTS.some(part => key.toLowerCase().includes(part))
  ) {
    return REDACTED
  }
  return typeof value === 'string'
    ? value.replace(new RegExp(EMAIL_SOURCE, 'gi'), REDACTED)
    : value
}

/**
 * Removes personal data from top-level params: deny-listed keys lose their whole value, and email addresses are replaced
 * inside any string. Booleans and nested values are left alone.
 */
export const redactPii = (
  params: EventParams,
): { params: EventParams; redactedKeys: string[] } => {
  const entries = Object.entries(params).map(
    ([key, value]) => [key, value, redactValue(key, value)] as const,
  )

  return {
    params: Object.fromEntries(entries.map(([key, , safe]) => [key, safe])),
    redactedKeys: entries
      .filter(([, value, safe]) => safe !== value)
      .map(([key]) => key),
  }
}
