import { describe, expect, it } from 'vitest'
import { deriveFbc, parseAttribution, toAttribution } from './attribution.js'

describe('parseAttribution', () => {
  it('captures UTM params and click IDs, with the landing page and referrer', () => {
    expect(
      parseAttribution({
        url: 'https://shop.test/sale?utm_source=news&utm_medium=email&gclid=abc&page=2',
        referrer: 'https://mail.test/inbox?id=123',
        capturedAt: 1000,
      }),
    ).toEqual({
      utm_source: 'news',
      utm_medium: 'email',
      gclid: 'abc',
      landing_page: 'https://shop.test/sale',
      referrer: 'https://mail.test/inbox',
      captured_at: 1000,
    })
  })

  it('returns undefined when the URL has no campaign params', () => {
    expect(
      parseAttribution({ url: 'https://shop.test/?page=2', capturedAt: 1 }),
    ).toBeUndefined()
  })

  it('redacts email addresses that email tools put in campaign params', () => {
    expect(
      parseAttribution({
        url: 'https://shop.test/?utm_source=crm&utm_term=a%40b.com',
        capturedAt: 1,
      })?.utm_term,
    ).toBe('[redacted]')
  })

  it('trims values and caps them at 100 characters', () => {
    const long = 'x'.repeat(150)
    expect(
      parseAttribution({
        url: `https://shop.test/?utm_source=%20news%20&utm_content=${long}`,
        capturedAt: 1,
      }),
    ).toMatchObject({ utm_source: 'news', utm_content: 'x'.repeat(100) })
  })

  it('ignores empty params', () => {
    expect(
      parseAttribution({
        url: 'https://shop.test/?utm_source=',
        capturedAt: 1,
      }),
    ).toBeUndefined()
  })
})

describe('toAttribution', () => {
  it('keeps a well-formed stored touch, dropping unknown fields', () => {
    expect(
      toAttribution({
        utm_source: 'news',
        injected: '<script>',
        landing_page: 'https://shop.test/',
        captured_at: 5,
      }),
    ).toEqual({
      utm_source: 'news',
      landing_page: 'https://shop.test/',
      captured_at: 5,
    })
  })

  it.each([null, 'text', {}, { landing_page: 1, captured_at: 5 }])(
    'discards malformed stored data: %j',
    value => {
      expect(toAttribution(value)).toBeUndefined()
    },
  )
})

describe('deriveFbc', () => {
  const touch = {
    fbclid: 'XYZ',
    landing_page: 'https://shop.test/',
    captured_at: 1700000000000,
  }

  it('uses the Pixel’s _fbc cookie as-is', () => {
    expect(deriveFbc({ fbcCookie: 'fb.1.1.ABC.extra', touch })).toBe(
      'fb.1.1.ABC.extra',
    )
  })

  it('builds fb.1.<ms>.<fbclid> from the touch when there is no cookie', () => {
    expect(deriveFbc({ touch })).toBe('fb.1.1700000000000.XYZ')
  })

  it('returns undefined without a cookie or an fbclid', () => {
    expect(
      deriveFbc({ touch: { landing_page: 'x', captured_at: 1 } }),
    ).toBeUndefined()
  })
})
