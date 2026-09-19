// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Attribution } from '../core/types.js'
import { createAttributionTracker } from './tracker.js'

const DAY_MS = 86_400_000
const touch = (utm_source: string, captured_at: number): Attribution => ({
  utm_source,
  landing_page: 'https://shop.test/',
  captured_at,
})

describe('attribution tracker', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the first touch and moves the last touch forward', () => {
    const tracker = createAttributionTracker({ ttlDays: 90 })

    tracker.observe(touch('news', Date.now()))
    tracker.observe(undefined)
    tracker.observe(touch('ads', Date.now()))

    expect(tracker.get()).toMatchObject({
      firstTouch: { utm_source: 'news' },
      lastTouch: { utm_source: 'ads' },
    })
  })

  it('persists first touch to localStorage and last touch to sessionStorage', () => {
    const tracker = createAttributionTracker({ ttlDays: 90 })

    tracker.observe(touch('news', Date.now()))
    tracker.persist()

    expect(
      JSON.parse(localStorage.getItem('rmt:attribution:first') ?? 'null'),
    ).toMatchObject({ utm_source: 'news' })
    expect(
      JSON.parse(sessionStorage.getItem('rmt:attribution:last') ?? 'null'),
    ).toMatchObject({ utm_source: 'news' })
  })

  it('restores an earlier visit’s first touch over this visit’s', () => {
    localStorage.setItem(
      'rmt:attribution:first',
      JSON.stringify(touch('newsletter', Date.now() - DAY_MS)),
    )
    const tracker = createAttributionTracker({ ttlDays: 90 })

    tracker.observe(touch('ads', Date.now()))
    tracker.restore()

    expect(tracker.get()).toMatchObject({
      firstTouch: { utm_source: 'newsletter' },
      lastTouch: { utm_source: 'ads' },
    })
  })

  it('discards a first touch older than the attribution window', () => {
    localStorage.setItem(
      'rmt:attribution:first',
      JSON.stringify(touch('old', Date.now() - 91 * DAY_MS)),
    )
    const tracker = createAttributionTracker({ ttlDays: 90 })

    tracker.restore()
    tracker.persist()

    expect(tracker.get().firstTouch).toBeUndefined()
    expect(localStorage.getItem('rmt:attribution:first')).toBeNull()
  })

  it('discards tampered storage', () => {
    localStorage.setItem('rmt:attribution:first', '{not json')
    sessionStorage.setItem('rmt:attribution:last', '{"captured_at":"soon"}')
    const tracker = createAttributionTracker({ ttlDays: 90 })

    tracker.restore()

    expect(tracker.get()).toEqual({
      firstTouch: undefined,
      lastTouch: undefined,
    })
  })

  it('erases stored touches but keeps them in memory for the page', () => {
    const tracker = createAttributionTracker({ ttlDays: 90 })
    tracker.observe(touch('news', Date.now()))
    tracker.persist()

    tracker.erase()

    expect(localStorage.getItem('rmt:attribution:first')).toBeNull()
    expect(sessionStorage.getItem('rmt:attribution:last')).toBeNull()
    expect(tracker.get().lastTouch).toMatchObject({ utm_source: 'news' })
  })

  it('keeps working in memory when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const tracker = createAttributionTracker({ ttlDays: 90 })

    tracker.observe(touch('news', Date.now()))
    expect(() => {
      tracker.persist()
      tracker.restore()
    }).not.toThrow()

    expect(tracker.get().lastTouch).toMatchObject({ utm_source: 'news' })
  })
})
