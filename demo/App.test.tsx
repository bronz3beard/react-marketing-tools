// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'react-marketing-tools'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemo } from './analytics'
import { App } from './App'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const renderPlayground = () => {
  const { analytics, inspector } = createDemo()
  const container = document.createElement('div')
  document.body.append(container)
  act(() =>
    createRoot(container).render(
      <AnalyticsProvider analytics={analytics}>
        <App inspector={inspector} />
      </AnalyticsProvider>,
    ),
  )
  return container
}

const button = (name: string) =>
  Array.from(document.querySelectorAll('button')).find(
    element => element.textContent === name,
  )!

const checkbox = (name: string) =>
  Array.from(document.querySelectorAll('label'))
    .find(label => label.textContent?.startsWith(name))!
    .querySelector('input')!

const click = (element: HTMLElement) => act(() => element.click())

/** The newest inspector row's code blocks, by heading. */
const latestRow = () => {
  const row = document.querySelector('.rows > li')!
  return {
    label: row.querySelector('h3 code')?.textContent,
    groups: Object.fromEntries(
      Array.from(row.querySelectorAll('.call-group')).map(group => [
        group.querySelector('h4')?.textContent,
        group.querySelector('pre')?.textContent ?? '',
      ]),
    ),
    hints: Array.from(row.querySelectorAll('.hint')).map(
      hint => hint.textContent,
    ),
  }
}

describe('playground', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    for (const key of ['dataLayer', 'gtag', 'fbq', '_fbq']) {
      Reflect.deleteProperty(window, key)
    }
  })

  it('shows what GTM, GA4, the Pixel and the relay receive for one event, all with the same event_id', () => {
    renderPlayground()

    click(button('Sign up'))

    const { label, groups } = latestRow()
    expect(label).toBe("track('sign_up')")
    expect(Object.keys(groups)).toEqual([
      'Google Tag Manager',
      'Google Analytics 4 (gtag.js)',
      'Meta Pixel',
      'Conversions API relay',
    ])
    expect(groups['Google Analytics 4 (gtag.js)']).toContain('"sign_up"')
    expect(groups['Meta Pixel']).toContain('"CompleteRegistration"')
    const eventId = /"event_id": "([0-9a-f-]{36})"/.exec(
      groups['Google Tag Manager'],
    )?.[1]
    expect(eventId).toBeDefined()
    expect(groups['Meta Pixel']).toContain(eventId)
    expect(groups['Conversions API relay']).toContain(eventId)
  })

  it('shows the effect of denied consent: the Pixel holds events and nothing is relayed', () => {
    renderPlayground()

    click(checkbox('Advertising'))
    expect(latestRow().groups['Meta Pixel']).toContain('"revoke"')
    click(button('Sign up'))

    const { groups, hints } = latestRow()
    expect(groups).not.toHaveProperty(['Conversions API relay'])
    expect(hints).toContain(
      'Consent is revoked: the Pixel holds these until it is granted.',
    )
  })

  it('tracks the autocaptured button from its data attributes', () => {
    renderPlayground()

    click(button('Autocaptured click'))

    expect(latestRow().label).toBe("track('cta_click')")
    expect(latestRow().groups['Google Tag Manager']).toContain(
      '"location": "playground"',
    )
  })

  it('announces new rows politely and uses only native controls', () => {
    renderPlayground()

    expect(document.querySelector('.rows')?.getAttribute('aria-live')).toBe(
      'polite',
    )
    expect(document.querySelectorAll('[tabindex]')).toHaveLength(0)
    expect(
      Array.from(document.querySelectorAll('button')).every(
        element => element.type === 'button',
      ),
    ).toBe(true)
  })
})
