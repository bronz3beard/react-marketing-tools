// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadIds, saveIds } from './ids'

describe('saved IDs', () => {
  beforeEach(() => localStorage.clear())

  it('come back after a reload', () => {
    saveIds({ gtm: 'GTM-ABC123', metaPixel: '987654321' })

    expect(loadIds()).toEqual({ gtm: 'GTM-ABC123', metaPixel: '987654321' })
  })

  it('are ignored when a stored value isn’t a valid ID, so the page still starts', () => {
    localStorage.setItem(
      'rmt-demo:ids',
      JSON.stringify({ gtm: 'GTM-ABC123', ga4: 'UA-1', metaPixel: 42 }),
    )

    expect(loadIds()).toEqual({ gtm: 'GTM-ABC123' })
  })

  it('are forgotten when none are given', () => {
    saveIds({ ga4: 'G-ABC123' })
    saveIds({})

    expect(localStorage.getItem('rmt-demo:ids')).toBeNull()
    expect(loadIds()).toEqual({})
  })

  it('start empty when storage holds something that isn’t JSON', () => {
    localStorage.setItem('rmt-demo:ids', '{')

    expect(loadIds()).toEqual({})
  })
})
