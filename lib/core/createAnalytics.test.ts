// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from './createAnalytics.js'
import { AnalyticsError } from './errors.js'
import type { AnalyticsConfig, AnalyticsEvent, Destination } from './types.js'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const recordingDestination = () => {
  const events: AnalyticsEvent[] = []
  const destination: Destination = {
    name: 'recorder',
    start: vi.fn(),
    track: event => events.push(event),
  }
  return { destination, events }
}

describe('createAnalytics', () => {
  afterEach(() => {
    Reflect.deleteProperty(crypto, 'randomUUID')
  })

  it('delivers events tracked before start() in order once started', () => {
    const { destination, events } = recordingDestination()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.track('first')
    analytics.track('second', { step: 2 })
    expect(events).toHaveLength(0)

    analytics.start()

    expect(events.map(event => event.name)).toEqual(['first', 'second'])
    expect(events[1].params).toEqual({ step: 2 })
  })

  it('delivers events immediately after start()', () => {
    const { destination, events } = recordingDestination()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.start()
    analytics.track('sign_up', { method: 'google' })

    expect(events).toEqual([
      {
        name: 'sign_up',
        params: { method: 'google' },
        eventId: expect.stringMatching(UUID_V4),
        timestamp: expect.any(Number),
      },
    ])
  })

  it('gives every tracked event its own id', () => {
    const { destination, events } = recordingDestination()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.start()
    analytics.track('a')
    analytics.track('b')

    expect(events[0].eventId).not.toBe(events[1].eventId)
  })

  it('starts each destination once even when start() is called again', () => {
    const { destination } = recordingDestination()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.start()
    analytics.start()

    expect(destination.start).toHaveBeenCalledTimes(1)
  })

  it('creates UUID event ids on insecure (plain HTTP) pages without crypto.randomUUID', () => {
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    })
    const { destination, events } = recordingDestination()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.start()
    analytics.track('page_ready')

    expect(events[0].eventId).toMatch(UUID_V4)
  })

  it('rejects a config without an explicit consent choice', () => {
    expect(() => createAnalytics({} as AnalyticsConfig)).toThrow(/"consent"/)
  })
})

describe('error policy', () => {
  const started = (config: Partial<AnalyticsConfig> = {}) => {
    const { destination, events } = recordingDestination()
    const onError = vi.fn()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
      onError,
      ...config,
    })
    analytics.start()
    return { analytics, events, onError }
  }

  it('throws on an invalid event name in debug mode, naming the GA4 rule', () => {
    const { analytics, events } = started({ debug: true })

    expect(() => analytics.track('Bad Name!')).toThrow(
      /letters, digits and underscores/,
    )
    expect(events).toHaveLength(0)
  })

  it('drops an invalid event in production and reports it once', () => {
    const { analytics, events, onError } = started()

    analytics.track('Bad Name!')

    expect(events).toHaveLength(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'AnalyticsError',
        code: 'invalid_event',
      }),
    )
  })

  it('redacts personal data in production, still sends the event and reports the redaction', () => {
    const { analytics, events, onError } = started()

    analytics.track('contact', { email_address: 'a@b.com', topic: 'x' })

    expect(events[0].params).toEqual({
      email_address: '[redacted]',
      topic: 'x',
    })
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'pii_redacted' }),
    )
  })

  it('throws instead of sending personal data in debug mode', () => {
    const { analytics, events } = started({ debug: true })

    expect(() => analytics.track('contact', { email: 'a@b.com' })).toThrow(
      /personal data/,
    )
    expect(events).toHaveLength(0)
  })

  it('still sends an event whose params exceed GA4 limits, reporting the problem', () => {
    const { analytics, events, onError } = started()

    analytics.track('search', { search_term: 'x'.repeat(101) })

    expect(events).toHaveLength(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_param' }),
    )
  })

  it('keeps delivering to other destinations when one throws, even in debug mode', () => {
    const failing: Destination = {
      name: 'broken',
      start() {},
      track() {
        throw new Error('vendor down')
      },
    }
    const { destination, events } = recordingDestination()
    const onError = vi.fn()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [failing, destination],
      debug: true,
      onError,
    })

    analytics.start()
    expect(() => analytics.track('purchase')).not.toThrow()

    expect(events).toHaveLength(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'destination_failed',
        cause: expect.objectContaining({ message: 'vendor down' }),
      }),
    )
  })

  it('reports to console.error when no onError is given', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const analytics = createAnalytics({ consent: 'granted' })

    analytics.start()
    analytics.track('Bad Name!')

    expect(consoleError).toHaveBeenCalledWith(expect.any(AnalyticsError))
    consoleError.mockRestore()
  })
})

describe('identify, page and reset', () => {
  const callLog = () => {
    const calls: string[] = []
    const destination: Destination = {
      name: 'log',
      start: () => calls.push('start'),
      track: event => calls.push(`track:${event.name}`),
      identify: ({ userId }) => calls.push(`identify:${userId}`),
      reset: () => calls.push('reset'),
    }
    return { destination, calls }
  }

  it('sends page views with the current location and title, through track() when a destination has no page()', () => {
    document.title = 'Pricing'
    const { destination, events } = recordingDestination()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.start()
    analytics.page({ plan: 'pro' })

    expect(events[0]).toMatchObject({
      name: 'page_view',
      params: {
        page_location: location.href,
        page_title: 'Pricing',
        plan: 'pro',
      },
    })
  })

  it('uses a destination’s own page() when it has one', () => {
    const page = vi.fn()
    const track = vi.fn()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [{ name: 'pages', start() {}, track, page }],
    })

    analytics.start()
    analytics.page()

    expect(page).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'page_view' }),
    )
    expect(track).not.toHaveBeenCalled()
  })

  it('keeps identify, track and reset in call order when they happen before start()', () => {
    const { destination, calls } = callLog()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
    })

    analytics.identify('user-42')
    analytics.track('purchase')
    analytics.reset()
    analytics.start()

    expect(calls).toEqual([
      'start',
      'identify:user-42',
      'track:purchase',
      'reset',
    ])
  })

  it('passes traits to destinations that match users with them', () => {
    const identify = vi.fn()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [{ name: 'matcher', start() {}, track() {}, identify }],
    })

    analytics.start()
    analytics.identify('user-42', { email: 'a@b.com' })

    expect(identify).toHaveBeenCalledWith({
      userId: 'user-42',
      traits: { email: 'a@b.com' },
    })
  })

  it('refuses an email address as the user id', () => {
    const { destination, calls } = callLog()
    const onError = vi.fn()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [destination],
      onError,
    })

    analytics.start()
    analytics.identify('a@b.com')

    expect(calls).toEqual(['start'])
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_user_id' }),
    )
  })
})
