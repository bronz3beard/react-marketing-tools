import { describe, expect, it } from 'vitest'
import { parseCookie } from './cookies.js'

describe('parseCookie', () => {
  const cookies = '_ga=GA1.1.123.456; _fbp=fb.1.1700000000000.999; token=a=b'

  it.each([
    ['_ga', 'GA1.1.123.456'],
    ['_fbp', 'fb.1.1700000000000.999'],
    ['token', 'a=b'],
  ])('reads %s', (name, value) => {
    expect(parseCookie(cookies, name)).toBe(value)
  })

  it('does not match a cookie whose name only starts the same way', () => {
    expect(parseCookie('_fbc_old=x; _fbc=fb.1.1.abc', '_fbc')).toBe(
      'fb.1.1.abc',
    )
    expect(parseCookie('_ga_ABC=GS2.1.s1', '_ga')).toBeUndefined()
  })

  it('returns undefined for a missing cookie or an empty string', () => {
    expect(parseCookie(cookies, '_fbc')).toBeUndefined()
    expect(parseCookie('', '_fbc')).toBeUndefined()
  })
})
