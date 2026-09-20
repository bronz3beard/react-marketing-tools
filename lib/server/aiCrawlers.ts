import type {
  MeasurementProtocolOptions,
  MeasurementProtocolResult,
} from './measurementProtocol.js'
import { sendMeasurementProtocolEvent } from './measurementProtocol.js'

/**
 * The AI crawlers you want to recognise, as `{ label: [user-agent fragment, …] }`, for example
 * `{ gptbot: ['GPTBot'], claudebot: ['ClaudeBot'] }`. Matching ignores case. The list is yours to keep up to date:
 * crawlers come and go, so the library ships none.
 */
export type AiAgents = Record<string, string[]>

/**
 * How this traffic is kept out of your visitor reports. Crawler hits are not people, and mixing them in inflates every
 * number you report.
 *
 * - `'separate-property'`: `measurementId` is a GA4 property used only for crawlers.
 * - `{ trafficType }`: the events carry that `traffic_type` value, and you exclude it with a data filter in
 *   **Admin → Data settings → Data filters** of the property you send to.
 */
export type AiCrawlerReporting = 'separate-property' | { trafficType: string }

export type AiCrawlerOptions = Omit<MeasurementProtocolOptions, 'consent'> & {
  /** Your label for the crawler, from `matchAiAgent()`. */
  agent: string
  keepSeparate: AiCrawlerReporting
}

/** Your label for the crawler behind a user agent, or undefined when it isn't one you listed. */
export const matchAiAgent = ({
  userAgent,
  agents,
}: {
  userAgent: string
  agents: AiAgents
}): string | undefined => {
  const haystack = userAgent.toLowerCase()
  return Object.entries(agents).find(([, fragments]) =>
    fragments.some(fragment => haystack.includes(fragment.toLowerCase())),
  )?.[0]
}

const invalidArgument = (message: string) =>
  new TypeError(`[react-marketing-tools] sendAiCrawlerEvent: ${message}`)

const RESERVED = ['traffic_type', 'ai_agent']

/**
 * Sends a crawler's visit to GA4, tagged so it can never be mistaken for a person: every event carries your `ai_agent`
 * label and a `traffic_type`. You must say how the traffic is kept separate, because crawler hits in a visitor property
 * quietly ruin sessions, engagement and conversion rates.
 *
 * Crawlers have no GA4 cookie, so pick the `clientId` yourself: one per crawler (`crawler.gptbot`) counts each crawler
 * as one visitor, a random one per request counts every fetch separately.
 */
export const sendAiCrawlerEvent = async (
  options: AiCrawlerOptions,
): Promise<MeasurementProtocolResult> => {
  const { agent, keepSeparate, events, ...rest } = options

  if (!agent) throw invalidArgument('agent is required')
  const trafficType =
    keepSeparate === 'separate-property'
      ? 'ai_crawler'
      : keepSeparate?.trafficType
  if (!trafficType) {
    throw invalidArgument(
      "keepSeparate is required: 'separate-property' when measurementId is a crawler-only property, or { trafficType } matching a GA4 data filter. Crawler hits must never land in a visitor property untagged.",
    )
  }

  const warnings = events.flatMap(event =>
    RESERVED.filter(param => event.params?.[param] !== undefined).map(
      param =>
        `event "${event.name}" param "${param}" was replaced: sendAiCrawlerEvent sets it`,
    ),
  )
  const result = await sendMeasurementProtocolEvent({
    ...rest,
    events: events.map(event => ({
      ...event,
      // Last, so they can't be overridden: this tagging is the whole point.
      params: { ...event.params, traffic_type: trafficType, ai_agent: agent },
    })),
  })

  return { ...result, warnings: [...warnings, ...result.warnings] }
}
