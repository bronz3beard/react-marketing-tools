import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ConversionsApiEvent,
  type ConversionsApiOptions,
  sendConversionsApiEvent,
} from './conversionsApi.js'

const fetchMock = vi.fn()

const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit]
  return { url, body: JSON.parse(String(init.body)) }
}

const purchase: ConversionsApiEvent = {
  eventName: 'Purchase',
  eventId: 'evt-1',
  eventTime: new Date('2026-09-19T10:00:00Z'),
  eventSourceUrl: 'https://shop.test/checkout',
  userData: {
    email: 'Ada@Example.com',
    clientIpAddress: '203.0.113.7',
    clientUserAgent: 'Mozilla/5.0',
    fbp: 'fb.1.1700000000000.123',
  },
  customData: { value: 42, currency: 'USD' },
}

const base: ConversionsApiOptions = {
  pixelId: '1234567890',
  accessToken: 'token',
  events: [purchase],
}

describe('sendConversionsApiEvent', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      Response.json({ events_received: 1, fbtrace_id: 'trace' }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts website events to the Graph API with hashed customer data and the Pixel’s event ID', async () => {
    const result = await sendConversionsApiEvent(base)

    const { url, body } = lastRequest()
    expect(url.origin + url.pathname).toBe(
      'https://graph.facebook.com/v26.0/1234567890/events',
    )
    expect(url.searchParams.get('access_token')).toBe('token')
    expect(body).toEqual({
      data: [
        {
          event_name: 'Purchase',
          event_time: 1789812000,
          action_source: 'website',
          event_id: 'evt-1',
          event_source_url: 'https://shop.test/checkout',
          user_data: {
            em: createHash('sha256').update('ada@example.com').digest('hex'),
            client_ip_address: '203.0.113.7',
            client_user_agent: 'Mozilla/5.0',
            fbp: 'fb.1.1700000000000.123',
          },
          custom_data: { value: 42, currency: 'USD' },
        },
      ],
    })
    expect(result).toEqual({
      ok: true,
      status: 200,
      body: { events_received: 1, fbtrace_id: 'trace' },
      warnings: [],
    })
  })

  it('uses a chosen Graph API version and test event code', async () => {
    await sendConversionsApiEvent({
      ...base,
      graphApiVersion: 'v27.0',
      testEventCode: 'TEST123',
    })

    const { url, body } = lastRequest()
    expect(url.pathname).toBe('/v27.0/1234567890/events')
    expect(body.test_event_code).toBe('TEST123')
  })

  it('returns Meta’s error instead of throwing', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: 'Invalid token' } }, { status: 400 }),
    )

    await expect(sendConversionsApiEvent(base)).resolves.toMatchObject({
      ok: false,
      status: 400,
      body: { error: { message: 'Invalid token' } },
    })
  })

  it('redacts personal data from custom data', async () => {
    const result = await sendConversionsApiEvent({
      ...base,
      events: [{ ...purchase, customData: { note: 'call a@b.com' } }],
    })

    expect(lastRequest().body.data[0].custom_data).toEqual({
      note: 'call [redacted]',
    })
    expect(result.warnings).toEqual([
      'event "Purchase": personal data redacted from customData note',
    ])
  })

  it('accepts non-website events without a page URL', async () => {
    await sendConversionsApiEvent({
      ...base,
      events: [
        {
          eventName: 'Purchase',
          actionSource: 'physical_store',
          userData: { email: 'a@b.com' },
        },
      ],
    })

    expect(lastRequest().body.data[0].action_source).toBe('physical_store')
  })

  it.each([
    [{ pixelId: 'fb-1' }, /numeric pixel ID/],
    [{ accessToken: '' }, /accessToken is required/],
    [{ events: [] }, /between 1 and 1000 events/],
    [
      { events: [{ ...purchase, eventSourceUrl: undefined }] },
      /needs eventSourceUrl and userData.clientUserAgent/,
    ],
    [
      { events: [{ ...purchase, userData: { email: 'a@b.com' } }] },
      /needs eventSourceUrl and userData.clientUserAgent/,
    ],
  ])(
    'rejects invalid arguments without sending: %j',
    async (change, message) => {
      await expect(
        sendConversionsApiEvent({ ...base, ...change }),
      ).rejects.toThrow(message)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})
