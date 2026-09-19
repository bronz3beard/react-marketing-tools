import { describe, expect, it } from 'vitest'
import {
  containsEmail,
  findEventNameProblem,
  findParamProblems,
  redactPii,
} from './validate.js'

describe('findEventNameProblem', () => {
  it.each(['sign_up', 'purchase', 'Step2_complete', 'a'.repeat(40)])(
    'accepts the GA4-valid name %s',
    name => {
      expect(findEventNameProblem(name)).toBeUndefined()
    },
  )

  it.each([
    ['Bad Name!', /letters, digits and underscores/],
    ['2nd_step', /start with a letter/],
    ['a'.repeat(41), /at most 40 characters/],
    ['', /start with a letter/],
    ['google_signal', /reserved prefix "google_"/],
    ['GA_custom', /reserved prefix "ga_"/],
    ['firebase_event', /reserved prefix "firebase_"/],
  ])('rejects %j', (name, reason) => {
    expect(findEventNameProblem(name)).toMatch(reason)
  })
})

describe('findParamProblems', () => {
  it('accepts params within GA4 limits', () => {
    expect(findParamProblems({ method: 'google', value: 42 })).toEqual([])
  })

  it('reports invalid param names', () => {
    expect(findParamProblems({ 'bad key': 1 })).toEqual([
      expect.stringMatching(/param "bad key"/),
    ])
  })

  it('reports more than 25 params', () => {
    const params = Object.fromEntries(
      Array.from({ length: 26 }, (_, i) => [`p${i}`, i]),
    )
    expect(findParamProblems(params)).toEqual([
      'has 26 params; the limit is 25',
    ])
  })

  it('reports string values over 100 characters, with GA4’s longer page limits', () => {
    expect(findParamProblems({ note: 'x'.repeat(101) })).toEqual([
      'param "note" is longer than 100 characters',
    ])
    expect(findParamProblems({ page_location: 'x'.repeat(1000) })).toEqual([])
    expect(findParamProblems({ page_title: 'x'.repeat(301) })).toEqual([
      'param "page_title" is longer than 300 characters',
    ])
  })
})

describe('redactPii', () => {
  it('replaces the whole value of personal-data keys, case-insensitively', () => {
    expect(
      redactPii({ email_address: 'a@b.com', Phone: 5551234, topic: 'x' }),
    ).toEqual({
      params: { email_address: '[redacted]', Phone: '[redacted]', topic: 'x' },
      redactedKeys: ['email_address', 'Phone'],
    })
  })

  it('keeps booleans and nested values of personal-data keys', () => {
    const params = { email_opt_in: true, address_book: { size: 3 } }
    expect(redactPii(params)).toEqual({ params, redactedKeys: [] })
  })

  it('redacts email addresses inside other strings, keeping the rest', () => {
    expect(
      redactPii({
        page_location: 'https://shop.test/unsubscribe?u=a.b+c@mail.co.uk&x=1',
        search_term: 'order for a%40b.com',
      }).params,
    ).toEqual({
      page_location: 'https://shop.test/unsubscribe?u=[redacted]&x=1',
      search_term: 'order for [redacted]',
    })
  })

  it('does not mutate the params it is given', () => {
    const params = { email: 'a@b.com' }
    redactPii(params)
    expect(params).toEqual({ email: 'a@b.com' })
  })
})

describe('containsEmail', () => {
  it.each([
    ['user@example.com', true],
    ['user%40example.com', true],
    ['user-42', false],
    ['@handle', false],
  ])('%s → %s', (value, expected) => {
    expect(containsEmail(value)).toBe(expected)
  })
})
