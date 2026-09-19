// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { AnalyticsConfig, AnalyticsEvent } from '../core/types.js'

const recorded = (config: Partial<AnalyticsConfig> = {}) => {
  const events: Pick<AnalyticsEvent, 'name' | 'params'>[] = []
  const analytics = createAnalytics({
    consent: 'granted',
    attribution: false,
    visitorId: false,
    autocapture: { clicks: true },
    destinations: [
      {
        name: 'recorder',
        start: () => {},
        track: ({ name, params }) => events.push({ name, params }),
      },
    ],
    ...config,
  })
  return { analytics, events }
}

const click = (selector: string) =>
  document
    .querySelector(selector)
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

describe('click autocapture', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('tracks a click inside a marked element once, with its params in snake_case', () => {
    document.body.innerHTML = `
      <button data-analytics-event="cta_click" data-analytics-param-location="hero" data-analytics-param-button-text="Start">
        <span id="label">Start</span>
      </button>`
    const { analytics, events } = recorded()
    analytics.start()

    click('#label')

    expect(events).toEqual([
      {
        name: 'cta_click',
        params: { location: 'hero', button_text: 'Start' },
      },
    ])
  })

  it('still tracks when the app’s own handler stops the click from bubbling', () => {
    document.body.innerHTML = `<a id="link" data-analytics-event="nav_click" href="#pricing">Pricing</a>`
    document
      .querySelector('#link')
      ?.addEventListener('click', event => event.stopPropagation())
    const { analytics, events } = recorded()
    analytics.start()

    click('#link')

    expect(events.map(event => event.name)).toEqual(['nav_click'])
  })

  it('covers elements added after start, and uses the nearest marked element', () => {
    const { analytics, events } = recorded()
    analytics.start()
    document.body.innerHTML = `
      <section data-analytics-event="section_click">
        <button id="inner" data-analytics-event="inner_click">Go</button>
      </section>`

    click('#inner')

    expect(events.map(event => event.name)).toEqual(['inner_click'])
  })

  it('ignores clicks outside marked elements', () => {
    document.body.innerHTML = `<button id="plain">Plain</button>`
    const { analytics, events } = recorded()
    analytics.start()

    click('#plain')

    expect(events).toEqual([])
  })

  it('applies the usual event checks, such as personal-data redaction', () => {
    document.body.innerHTML = `<button id="b" data-analytics-event="contact_click" data-analytics-param-email="a@b.com">Mail</button>`
    const { analytics, events } = recorded({ onError: () => {} })
    analytics.start()

    click('#b')

    expect(events[0].params.email).toBe('[redacted]')
  })

  it('adds no listener before start(), or when autocapture is off', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener')

    recorded()
    recorded({ autocapture: undefined }).analytics.start()
    recorded({ autocapture: { clicks: false } }).analytics.start()

    expect(addEventListener).not.toHaveBeenCalledWith(
      'click',
      expect.anything(),
      expect.anything(),
    )
  })
})
