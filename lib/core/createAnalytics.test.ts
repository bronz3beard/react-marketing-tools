// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from './createAnalytics.js'
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
