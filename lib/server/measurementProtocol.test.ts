import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type MeasurementProtocolOptions,
  sendMeasurementProtocolEvent,
} from './measurementProtocol.js'

const fetchMock = vi.fn()

const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit]
  return { url, body: JSON.parse(String(init.body)) }
}

const base: MeasurementProtocolOptions = {
  measurementId: 'G-TEST1',
  apiSecret: 'secret',
  clientId: '123.456',
  events: [{ name: 'purchase', params: { value: 42, currency: 'USD' } }],
}

describe('sendMeasurementProtocolEvent', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts events with the session ID and engagement time, so they join the visitor’s session', async () => {
    const result = await sendMeasurementProtocolEvent({
      ...base,
      sessionId: '1700000789',
    })

    const { url, body } = lastRequest()
    expect(url.origin + url.pathname).toBe(
      'https://www.google-analytics.com/mp/collect',
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      measurement_id: 'G-TEST1',
      api_secret: 'secret',
    })
    expect(body).toEqual({
      client_id: '123.456',
      events: [
        {
          name: 'purchase',
          params: {
            session_id: '1700000789',
            engagement_time_msec: 1,
            value: 42,
            currency: 'USD',
          },
        },
      ],
    })
    expect(result).toEqual({ ok: true, status: 204, warnings: [] })
  })

  it('sends consent in GA4’s uppercase format, with the user ID, to the EU endpoint', async () => {
    await sendMeasurementProtocolEvent({
      ...base,
      userId: 'user-42',
      consent: { adUserData: 'granted', adPersonalization: 'denied' },
      region: 'eu',
    })

    const { url, body } = lastRequest()
    expect(url.host).toBe('region1.google-analytics.com')
    expect(body).toMatchObject({
      user_id: 'user-42',
      consent: { ad_user_data: 'GRANTED', ad_personalization: 'DENIED' },
    })
  })

  it('validates against the debug endpoint and returns GA4’s findings', async () => {
    const messages = [{ fieldPath: 'events', description: 'bad value' }]
    fetchMock.mockResolvedValue(Response.json({ validationMessages: messages }))

    const result = await sendMeasurementProtocolEvent({
      ...base,
      validate: true,
    })

    expect(lastRequest().url.pathname).toBe('/debug/mp/collect')
    expect(result).toMatchObject({ ok: false, validationMessages: messages })
  })

  it('redacts personal data and reports GA4 limit problems instead of failing', async () => {
    const result = await sendMeasurementProtocolEvent({
      ...base,
      events: [
        {
          name: 'contact',
          params: { email: 'a@b.com', note: 'x'.repeat(101) },
        },
      ],
    })

    expect(lastRequest().body.events[0].params.email).toBe('[redacted]')
    expect(result.warnings).toEqual([
      'event "contact" param "note" is longer than 100 characters',
      'event "contact": personal data redacted from email',
    ])
  })

  it('reports an HTTP failure instead of throwing', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }))

    await expect(sendMeasurementProtocolEvent(base)).resolves.toMatchObject({
      ok: false,
      status: 500,
    })
  })

  it.each([
    [{ measurementId: 'UA-1' }, /G-XXXXXXX/],
    [{ apiSecret: '' }, /apiSecret is required/],
    [{ clientId: '' }, /clientId is required/],
    [{ userId: 'a@b.com' }, /not personal data/],
    [{ events: [] }, /between 1 and 25 events/],
    [
      { events: Array.from({ length: 26 }, () => ({ name: 'x' })) },
      /between 1 and 25 events/,
    ],
    [{ events: [{ name: 'Bad Name!' }] }, /letters, digits and underscores/],
  ])(
    'rejects invalid arguments without sending: %j',
    async (change, message) => {
      await expect(
        sendMeasurementProtocolEvent({ ...base, ...change }),
      ).rejects.toThrow(message)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})
