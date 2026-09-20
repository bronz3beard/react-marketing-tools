import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type AiCrawlerOptions,
  matchAiAgent,
  sendAiCrawlerEvent,
} from './aiCrawlers.js'

const fetchMock = vi.fn()

const sentEvents = () => {
  const [, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit]
  return JSON.parse(String(init.body)).events
}

const agents = { gptbot: ['GPTBot'], claudebot: ['ClaudeBot', 'anthropic-ai'] }

const base: AiCrawlerOptions = {
  measurementId: 'G-CRAWLERS',
  apiSecret: 'secret',
  clientId: 'crawler.gptbot',
  agent: 'gptbot',
  keepSeparate: 'separate-property',
  events: [
    { name: 'page_view', params: { page_location: 'https://shop.test/' } },
  ],
}

describe('matchAiAgent', () => {
  it.each([
    [
      'Mozilla/5.0 AppleWebKit (compatible; GPTBot/1.2; +https://openai.com/gptbot)',
      'gptbot',
    ],
    [
      'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      'claudebot',
    ],
    ['anthropic-ai/1.0', 'claudebot'],
  ])('recognises %s', (userAgent, label) => {
    expect(matchAiAgent({ userAgent, agents })).toBe(label)
  })

  it('returns nothing for a browser, or for a crawler the site didn’t list', () => {
    expect(
      matchAiAgent({ userAgent: 'Mozilla/5.0 (Macintosh) Safari', agents }),
    ).toBeUndefined()
    expect(
      matchAiAgent({ userAgent: 'PerplexityBot/1.0', agents }),
    ).toBeUndefined()
  })
})

describe('sendAiCrawlerEvent', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tags every event with the crawler and a traffic type, so it can’t pass for a visitor', async () => {
    await sendAiCrawlerEvent(base)

    expect(sentEvents()[0].params).toMatchObject({
      page_location: 'https://shop.test/',
      traffic_type: 'ai_crawler',
      ai_agent: 'gptbot',
    })
  })

  it('uses the traffic type the site filters on', async () => {
    await sendAiCrawlerEvent({
      ...base,
      keepSeparate: { trafficType: 'bots_excluded_by_filter' },
    })

    expect(sentEvents()[0].params.traffic_type).toBe('bots_excluded_by_filter')
  })

  it('replaces tags the caller tried to set, and says so', async () => {
    const result = await sendAiCrawlerEvent({
      ...base,
      events: [{ name: 'page_view', params: { traffic_type: 'internal' } }],
    })

    expect(sentEvents()[0].params.traffic_type).toBe('ai_crawler')
    expect(result.warnings).toContain(
      'event "page_view" param "traffic_type" was replaced: sendAiCrawlerEvent sets it',
    )
  })

  it.each([
    [{ keepSeparate: undefined }, /keepSeparate is required/],
    [{ keepSeparate: { trafficType: '' } }, /keepSeparate is required/],
    [{ agent: '' }, /agent is required/],
  ])('refuses to send without %j', async (change, message) => {
    await expect(
      sendAiCrawlerEvent({ ...base, ...change } as AiCrawlerOptions),
    ).rejects.toThrow(message)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
