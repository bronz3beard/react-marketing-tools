// @vitest-environment jsdom
import { act, StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalytics } from '../core/createAnalytics.js'
import type { Analytics } from '../core/types.js'
import { AnalyticsProvider, useAnalytics } from './AnalyticsProvider.js'

// Tells React this environment supports act(), so it doesn't warn.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const render = (ui: ReactNode) => {
  const root = createRoot(document.createElement('div'))
  act(() => root.render(ui))
}

const readDataLayer = () =>
  (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer')
  })

  it('starts analytics once under StrictMode', () => {
    const start = vi.fn()
    const analytics = createAnalytics({
      consent: 'granted',
      destinations: [{ name: 'spy', start, track() {} }],
    })

    render(
      <StrictMode>
        <AnalyticsProvider analytics={analytics}>
          <p>app</p>
        </AnalyticsProvider>
      </StrictMode>,
    )

    expect(start).toHaveBeenCalledTimes(1)
  })

  it('delivers events a child tracks when it mounts, before the provider has started', () => {
    const TracksOnMount = () => {
      const { track } = useAnalytics()
      useEffect(() => track('checkout_viewed'), [track])
      return null
    }
    const analytics = createAnalytics({
      consent: 'granted',
      gtm: { containerId: 'GTM-TEST1', loadScript: false },
    })

    render(
      <AnalyticsProvider analytics={analytics}>
        <TracksOnMount />
      </AnalyticsProvider>,
    )

    expect(readDataLayer()).toContainEqual(
      expect.objectContaining({ event: 'checkout_viewed' }),
    )
  })

  it('gives components the instance it was given', () => {
    let received: Analytics | undefined
    const Reader = () => {
      received = useAnalytics()
      return null
    }
    const analytics = createAnalytics({ consent: 'granted' })

    render(
      <AnalyticsProvider analytics={analytics}>
        <Reader />
      </AnalyticsProvider>,
    )

    expect(received).toBe(analytics)
  })
})

describe('useAnalytics', () => {
  it('throws a clear error outside <AnalyticsProvider>', () => {
    const Orphan = () => {
      useAnalytics()
      return null
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Orphan />)).toThrow(
      'useAnalytics must be used within <AnalyticsProvider>',
    )
    consoleError.mockRestore()
  })
})
