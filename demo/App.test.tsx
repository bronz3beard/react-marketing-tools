// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'react-marketing-tools'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemo } from './analytics'
import { App } from './App'
import type { DemoIds } from './ids'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const renderPlayground = ({
  ids = {},
  onSaveIds = () => true,
}: {
  ids?: DemoIds
  onSaveIds?: (ids: DemoIds) => boolean
} = {}) => {
  const { analytics, inspector } = createDemo(ids)
  const container = document.createElement('div')
  document.body.append(container)
  act(() =>
    createRoot(container).render(
      <AnalyticsProvider analytics={analytics}>
        <App inspector={inspector} ids={ids} onSaveIds={onSaveIds} />
      </AnalyticsProvider>,
    ),
  )
  return container
}

/** Lets promises (visitor ID, clipboard) settle and React re-render. */
const settle = () => act(async () => {})

const field = (name: string) =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!

const rowLabels = () =>
  Array.from(document.querySelectorAll('.rows > li h3 code'))
    .map(label => label.textContent)
    .reverse()

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
      Array.from(document.querySelectorAll('button')).every(element =>
        element.hasAttribute('type'),
      ),
    ).toBe(true)
  })

  describe('your own IDs', () => {
    it('refuses an ID in the wrong format, and saves valid ones', () => {
      const onSaveIds = vi.fn(() => true)
      renderPlayground({ onSaveIds })

      field('ga4').value = 'UA-12345-1'
      click(button('Use my IDs'))
      expect(field('ga4').validity.patternMismatch).toBe(true)
      expect(onSaveIds).not.toHaveBeenCalled()

      field('ga4').value = 'G-ABC123'
      field('metaPixel').value = '987654321'
      click(button('Use my IDs'))
      expect(onSaveIds).toHaveBeenCalledWith({
        ga4: 'G-ABC123',
        metaPixel: '987654321',
      })
    })

    it('says so when the browser won’t keep them', () => {
      renderPlayground({ onSaveIds: () => false })

      click(button('Back to placeholders'))

      expect(document.querySelector('[role="alert"]')?.textContent).toMatch(
        /blocks storage/,
      )
    })

    it('loads the real vendor scripts for the IDs given, and only those', () => {
      renderPlayground({ ids: { gtm: 'GTM-ABC123', ga4: 'G-ABC123' } })

      const sources = Array.from(document.scripts).map(script => script.src)
      expect(sources).toEqual(
        expect.arrayContaining([
          expect.stringContaining('gtm.js?id=GTM-ABC123'),
          expect.stringContaining('gtag/js?id=G-ABC123'),
        ]),
      )
      expect(sources.some(src => src.includes('fbevents.js'))).toBe(false)
      expect(document.querySelector('header p')?.textContent).toMatch(
        /Your IDs are in use/,
      )
    })
  })

  it('shows the campaign a visitor arrived from, and attaches it to events', () => {
    history.replaceState(
      {},
      '',
      '/?utm_source=newsletter&utm_medium=email&utm_campaign=autumn_sale',
    )
    renderPlayground()

    click(button('Sign up'))

    const panel = document.querySelector('[aria-labelledby="campaign-title"]')
    expect(panel?.querySelector('pre')?.textContent).toContain(
      '"utm_source": "newsletter"',
    )
    expect(latestRow().groups['Google Tag Manager']).toContain(
      '"utm_campaign": "autumn_sale"',
    )
    history.replaceState({}, '', '/')
  })

  it('walks a journey and sends its events in order', () => {
    renderPlayground()

    click(button('Step: cart'))
    click(button('Step: shipping'))
    click(button('Complete'))

    expect(rowLabels().slice(-4)).toEqual([
      "track('journey_start')",
      "track('journey_step')",
      "track('journey_step')",
      "track('journey_complete')",
    ])
    expect(button('Complete').disabled).toBe(true)
    click(button('New journey'))
    expect(button('Complete').disabled).toBe(false)
  })

  it('copies the setup with the visitor’s IDs and confirms in a dialog', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    HTMLDialogElement.prototype.showModal ??= function (
      this: HTMLDialogElement,
    ) {
      this.open = true
    }
    renderPlayground({ ids: { ga4: 'G-ABC123' } })

    click(button('Copy setup code'))
    await settle()

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("ga4: { measurementId: 'G-ABC123' }"),
    )
    expect(document.querySelector('dialog')?.open).toBe(true)
    expect(document.querySelector('#snippet-title')?.textContent).toBe(
      'Copied to your clipboard',
    )
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('shows the visitor ID only while analytics consent is granted', async () => {
    renderPlayground()
    await settle()

    const panel = () =>
      document.querySelector('[aria-labelledby="visitor-title"]')!.textContent
    expect(panel()).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)

    click(checkbox('Analytics'))
    await settle()
    expect(panel()).toContain('None without analytics consent.')
  })
})
