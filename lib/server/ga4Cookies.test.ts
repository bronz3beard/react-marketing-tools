import { describe, expect, it } from 'vitest'
import { readGa4Cookies } from './ga4Cookies.js'

describe('readGa4Cookies', () => {
  it('reads the client ID and a current (GS2) session cookie', () => {
    expect(
      readGa4Cookies({
        cookieHeader:
          'other=1; _ga=GA1.1.123456789.1700000000; _ga_ABC123=GS2.1.s1700000789$o3$g1$t1700000900$j0$l0$h0',
        measurementId: 'G-ABC123',
      }),
    ).toEqual({ clientId: '123456789.1700000000', sessionId: '1700000789' })
  })

  it('reads an older (GS1) session cookie', () => {
    expect(
      readGa4Cookies({
        cookieHeader:
          '_ga=GA1.1.1.2; _ga_ABC123=GS1.1.1700000789.3.1.1700000900.0.0.0',
        measurementId: 'G-ABC123',
      }).sessionId,
    ).toBe('1700000789')
  })

  it('only reads the session cookie of the given stream', () => {
    expect(
      readGa4Cookies({
        cookieHeader: '_ga_OTHER=GS2.1.s1700000789$o1',
        measurementId: 'G-ABC123',
      }),
    ).toEqual({})
  })

  it('ignores malformed cookies', () => {
    expect(
      readGa4Cookies({
        cookieHeader: '_ga=not-a-ga-cookie; _ga_ABC123=garbage',
        measurementId: 'G-ABC123',
      }),
    ).toEqual({})
  })
})
