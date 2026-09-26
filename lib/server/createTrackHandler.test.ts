import { createHash } from 'node:crypto'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RelayPayload } from '../destinations/serverRelay.js'
import {
  createTrackHandler,
  type TrackHandlerOptions,
} from './createTrackHandler.js'

const fetchMock = vi.fn()
const onError = vi.fn()

const options: TrackHandlerOptions = {
  allowedOrigins: ['https://shop.test'],
  meta: { pixelId: '1234567890', accessToken: 'token' },
  onError,
}

const payload: RelayPayload = {
  v: 1,
  eventName: 'Purchase',
  eventId: 'evt-1',
  customData: { value: 42, currency: 'USD' },
  eventSourceUrl: 'https://shop.test/checkout',
  consent: { adUserData: 'granted' },
  userData: {
    externalId: 'user-42',
    email: 'Ada@Example.com',
    fbp: 'fb.1.1700000000000.123',
  },
}

const post = ({
  body = JSON.stringify(payload),
  headers = {},
}: {
  body?: BodyInit
  headers?: Record<string, string>
} = {}) =>
  new Request('https://shop.test/api/track', {
    method: 'POST',
    headers: {
      origin: 'https://shop.test',
      'user-agent': 'Mozilla/5.0',
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      ...headers,
    },
    body,
    // Required by Node's fetch for stream bodies.
    ...(body instanceof ReadableStream && { duplex: 'half' }),
  })

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex')

const sentToMeta = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit]
  return { url, body: JSON.parse(String(init.body)) }
}

describe('createTrackHandler', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(Response.json({ events_received: 1 }))
    onError.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the Pixel event to the Conversions API with the same event ID, the visitor’s IP address and user agent', async () => {
    const response = await createTrackHandler(options)(post())

    expect(response.status).toBe(204)
    const { url, body } = sentToMeta()
    expect(url.pathname).toBe('/v26.0/1234567890/events')
    expect(body.data).toEqual([
      {
        event_name: 'Purchase',
        event_time: expect.any(Number),
        action_source: 'website',
        event_id: 'evt-1',
        event_source_url: 'https://shop.test/checkout',
        user_data: {
          em: sha256('ada@example.com'),
          external_id: sha256('user-42'),
          client_ip_address: '203.0.113.7',
          client_user_agent: 'Mozilla/5.0',
          fbp: 'fb.1.1700000000000.123',
        },
        custom_data: { value: 42, currency: 'USD' },
      },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('takes the IP address and user agent from the request, never from the body', async () => {
    const spoofed = {
      ...payload,
      userData: { clientIpAddress: '198.51.100.1', clientUserAgent: 'bot' },
    }

    await createTrackHandler(options)(post({ body: JSON.stringify(spoofed) }))

    expect(sentToMeta().body.data[0].user_data).toEqual({
      client_ip_address: '203.0.113.7',
      client_user_agent: 'Mozilla/5.0',
    })
  })

  it('passes the test event code and Graph API version through', async () => {
    await createTrackHandler({
      ...options,
      meta: {
        ...options.meta,
        testEventCode: 'TEST1',
        graphApiVersion: 'v27.0',
      },
    })(post())

    const { url, body } = sentToMeta()
    expect(url.pathname).toBe('/v27.0/1234567890/events')
    expect(body.test_event_code).toBe('TEST1')
  })

  it('answers 204 without forwarding when the visitor denied sharing data with ad platforms', async () => {
    const denied = { ...payload, consent: { adUserData: 'denied' } }

    const response = await createTrackHandler(options)(
      post({ body: JSON.stringify(denied) }),
    )

    expect(response.status).toBe(204)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('refuses without forwarding', () => {
    it.each([
      ['a GET request', new Request('https://shop.test/api/track'), 405],
      ['a missing Origin', post({ headers: { origin: '' } }), 403],
      [
        'another site’s Origin',
        post({ headers: { origin: 'https://evil.test' } }),
        403,
      ],
      ['a body over 16 KB', post({ body: 'x'.repeat(16 * 1024 + 1) }), 413],
      [
        'a streamed body over 16 KB, without Content-Length',
        post({
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(16 * 1024 + 1))
              controller.close()
            },
          }),
        }),
        413,
      ],
      ['invalid JSON', post({ body: '{' }), 400],
      [
        'an unknown body version',
        post({ body: JSON.stringify({ ...payload, v: 2 }) }),
        400,
      ],
      [
        'a page URL that isn’t http(s)',
        post({
          body: JSON.stringify({ ...payload, eventSourceUrl: 'javascript:x' }),
        }),
        400,
      ],
      [
        'user data that isn’t text',
        post({
          body: JSON.stringify({ ...payload, userData: { email: ['a'] } }),
        }),
        400,
      ],
      ['a missing User-Agent', post({ headers: { 'user-agent': '' } }), 400],
    ])('%s', async (_case, request, status) => {
      const response = await createTrackHandler(options)(request)

      expect(response.status).toBe(status)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  // Property-based (fast-check): the body is untrusted, so check the handler against generated input, not just examples.
  describe('with generated bodies', () => {
    it('answers 400 without forwarding for any body that isn’t a relay event', async () => {
      const handler = createTrackHandler(options)

      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string(),
            fc.jsonValue().map(value => JSON.stringify(value)),
          ),
          async body => {
            const response = await handler(post({ body }))

            expect(response.status).toBe(400)
            expect(fetchMock).not.toHaveBeenCalled()
          },
        ),
      )
    })

    it('forwards or answers 400, never failing, whatever value any field of the event holds', async () => {
      const handler = createTrackHandler(options)

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.keys(payload)),
          fc.jsonValue(),
          async (field, value) => {
            fetchMock.mockClear()

            const response = await handler(
              post({ body: JSON.stringify({ ...payload, [field]: value }) }),
            )

            expect([204, 400]).toContain(response.status)
            if (response.status === 400) {
              expect(fetchMock).not.toHaveBeenCalled()
            }
            expect(onError).not.toHaveBeenCalled()
          },
        ),
      )
    })
  })

  it('answers 502 and reports when Meta rejects the event', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: 'Invalid token' } }, { status: 400 }),
    )

    const response = await createTrackHandler(options)(post())

    expect(response.status).toBe(502)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Meta rejected "Purchase" (HTTP 400)'),
        cause: { error: { message: 'Invalid token' } },
      }),
    )
  })

  it('answers 502 and reports when Meta can’t be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const response = await createTrackHandler(options)(post())

    expect(response.status).toBe(502)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ cause: new TypeError('fetch failed') }),
    )
  })

  it.each([
    [{ allowedOrigins: [] }, /at least one origin/],
    [
      { allowedOrigins: ['https://shop.test/'] },
      /without a path or trailing slash/,
    ],
    [{ allowedOrigins: ['shop.test'] }, /without a path or trailing slash/],
    [{ meta: { pixelId: 'px', accessToken: 't' } }, /numeric pixel ID/],
    [{ meta: { pixelId: '1', accessToken: '' } }, /accessToken is required/],
  ])('rejects the options %j when it is created', (change, message) => {
    expect(() => createTrackHandler({ ...options, ...change })).toThrow(message)
  })
})
