import { redactPii } from '../core/validate.js'
import type { AiSources, Attribution, CampaignParam } from '../core/types.js'

// UTM parameters (GA4's campaign dimensions) and the ad-click IDs worth keeping for offline conversion uploads.
export const CAMPAIGN_PARAMS: readonly CampaignParam[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'li_fat_id',
  'twclid',
]

// GA4's limit for a param value; anyone can craft a campaign link, so values are also bounded.
const MAX_VALUE_LENGTH = 100

/** Origin and path only: query strings and fragments can carry personal data. */
const pageWithoutQuery = (url: string): string | undefined => {
  if (!URL.canParse(url)) return undefined
  const { origin, pathname } = new URL(url)
  return origin + pathname
}

/** Your label for the AI assistant a referrer belongs to: an exact hostname match, or a subdomain of one. */
export const matchAiSource = ({
  referrer,
  aiSources,
}: {
  referrer?: string
  aiSources?: AiSources
}): string | undefined => {
  if (!referrer || !aiSources || !URL.canParse(referrer)) return undefined

  const host = new URL(referrer).hostname.toLowerCase()
  return Object.entries(aiSources).find(([, hostnames]) =>
    hostnames.some(candidate => {
      const hostname = candidate.toLowerCase()
      return host === hostname || host.endsWith(`.${hostname}`)
    }),
  )?.[0]
}

/**
 * The campaign behind a visit, from its landing URL, or the AI assistant that sent it. `undefined` when the URL carries
 * no campaign params and the referrer isn't one of `aiSources`, so a plain navigation never replaces an earlier touch.
 * Values are email-redacted (email tools put addresses in `utm_term`).
 */
export const parseAttribution = ({
  url,
  referrer,
  capturedAt,
  aiSources,
}: {
  url: string
  referrer?: string
  capturedAt: number
  aiSources?: AiSources
}): Attribution | undefined => {
  if (!URL.canParse(url)) return undefined

  const { searchParams } = new URL(url)
  const found = CAMPAIGN_PARAMS.flatMap(param => {
    const value = searchParams.get(param)?.trim()
    return value ? [[param, value] as const] : []
  })
  const aiSource = matchAiSource({ referrer, aiSources })
  if (found.length === 0 && !aiSource) return undefined

  const { params: redacted } = redactPii(Object.fromEntries(found))
  const campaign = Object.fromEntries(
    Object.entries(redacted).map(([param, value]) => [
      param,
      String(value).slice(0, MAX_VALUE_LENGTH),
    ]),
  )
  const referrerPage = referrer ? pageWithoutQuery(referrer) : undefined

  return {
    ...campaign,
    landing_page: pageWithoutQuery(url) ?? url,
    ...(referrerPage ? { referrer: referrerPage } : {}),
    ...(aiSource ? { ai_source: aiSource } : {}),
    captured_at: capturedAt,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Stored attribution is untrusted input: anything that isn't a well-formed touch is discarded. */
export const toAttribution = (value: unknown): Attribution | undefined => {
  if (
    !isRecord(value) ||
    typeof value.captured_at !== 'number' ||
    typeof value.landing_page !== 'string'
  ) {
    return undefined
  }
  const campaign = Object.fromEntries(
    CAMPAIGN_PARAMS.flatMap(param =>
      typeof value[param] === 'string' ? [[param, value[param]]] : [],
    ),
  )
  return {
    ...campaign,
    landing_page: value.landing_page,
    ...(typeof value.referrer === 'string' ? { referrer: value.referrer } : {}),
    ...(typeof value.ai_source === 'string'
      ? { ai_source: value.ai_source }
      : {}),
    captured_at: value.captured_at,
  }
}

/**
 * Meta's click ID for the Conversions API: the Pixel's `_fbc` cookie as-is (Meta may append to it), otherwise built from
 * the touch's `fbclid` in Meta's documented `fb.1.<creation time ms>.<fbclid>` format.
 */
export const deriveFbc = ({
  fbcCookie,
  touch,
}: {
  fbcCookie?: string
  touch?: Attribution
}): string | undefined =>
  fbcCookie ??
  (touch?.fbclid ? `fb.1.${touch.captured_at}.${touch.fbclid}` : undefined)
