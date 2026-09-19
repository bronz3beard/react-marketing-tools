// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { AnalyticsConfig, AnalyticsEvent } from '../core/types.js'

const recorded = (config: Partial<AnalyticsConfig> = {}) => {
  const events: Pick<AnalyticsEvent, 'name' | 'params'>[] = []
  const analytics = createAnalytics({
    consent: 'granted',
    attribution: false,
    visitorId: false,
    destinations: [
      {
        name: 'recorder',
        start: () => {},
        track: ({ name, params }) => events.push({ name, params }),
      },
    ],
    ...config,
  })
  analytics.start()
  return { analytics, events }
}

describe('journey()', () => {
  it('sends journey_start before the first step, then numbered steps, all with the same journey ID', () => {
    const { analytics, events } = recorded()
    const checkout = analytics.journey('checkout')

    checkout.step('shipping')
    checkout.step('payment', { method: 'card' })
    checkout.complete({ value: 42, currency: 'USD' })

    const journeyId = events[0].params.journey_id
    expect(journeyId).toEqual(expect.any(String))
    expect(events).toEqual([
      {
        name: 'journey_start',
        params: { journey_id: journeyId, journey_name: 'checkout' },
      },
      {
        name: 'journey_step',
        params: {
          journey_id: journeyId,
          journey_name: 'checkout',
          step_name: 'shipping',
          step_index: 1,
        },
      },
      {
        name: 'journey_step',
        params: {
          method: 'card',
          journey_id: journeyId,
          journey_name: 'checkout',
          step_name: 'payment',
          step_index: 2,
        },
      },
      {
        name: 'journey_complete',
        params: {
          value: 42,
          currency: 'USD',
          journey_id: journeyId,
          journey_name: 'checkout',
          step_count: 2,
        },
      },
    ])
  })

  it('sends nothing until the journey’s first call, so creating one during render is free', () => {
    const { analytics, events } = recorded()

    analytics.journey('checkout')

    expect(events).toEqual([])
  })

  it('records where and why a journey was abandoned', () => {
    const { analytics, events } = recorded()
    const signup = analytics.journey('signup')

    signup.step('details')
    signup.abandon('timeout')

    expect(events.at(-1)).toEqual({
      name: 'journey_abandon',
      params: {
        journey_id: events[0].params.journey_id,
        journey_name: 'signup',
        step_count: 1,
        step_name: 'details',
        reason: 'timeout',
      },
    })
  })

  it('gives each journey its own ID', () => {
    const { analytics, events } = recorded()

    analytics.journey('checkout').step('cart')
    analytics.journey('checkout').step('cart')

    const [first, second] = events
      .filter(event => event.name === 'journey_start')
      .map(event => event.params.journey_id)
    expect(first).not.toBe(second)
  })

  it('keeps its own fields when params try to override them', () => {
    const { analytics, events } = recorded()

    analytics.journey('checkout').step('cart', { step_index: 99 })

    expect(events.at(-1)?.params.step_index).toBe(1)
  })

  it('reports calls after the journey ended, and sends nothing for them', () => {
    const onError = vi.fn()
    const { analytics, events } = recorded({ onError })
    const checkout = analytics.journey('checkout')

    checkout.complete()
    checkout.step('late')
    checkout.abandon()

    expect(events.map(event => event.name)).toEqual([
      'journey_start',
      'journey_complete',
    ])
    expect(onError).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'journey_ended',
        message: expect.stringContaining(
          'journey "checkout" is already completed, so step("late") was ignored',
        ),
      }),
    )
  })

  it('throws for calls after the journey ended in debug mode', () => {
    const { analytics } = recorded({ debug: true })
    const checkout = analytics.journey('checkout')

    checkout.abandon()

    expect(() => checkout.complete()).toThrow(/already abandoned/)
  })

  it('works when destructured, as from useAnalytics()', () => {
    const { analytics, events } = recorded()
    const { journey } = analytics

    journey('onboarding').step('welcome')

    expect(events.map(event => event.name)).toEqual([
      'journey_start',
      'journey_step',
    ])
  })
})
