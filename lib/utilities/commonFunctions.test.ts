import { describe, expect, it } from 'vitest'
import {
  hashString,
  objectHasAttributes,
  replaceWhiteSpace,
} from './commonFunctions'

describe('hashString', () => {
  it('returns the SHA-256 hex digest of the input', async () => {
    expect(await hashString('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})

describe('objectHasAttributes', () => {
  it('reports whether an object has any own keys when no key is given', () => {
    expect(objectHasAttributes({ a: 1 })).toBe(true)
    expect(objectHasAttributes({})).toBe(false)
  })

  it('checks own properties only, including objects that shadow hasOwnProperty', () => {
    expect(objectHasAttributes({ a: 1 }, 'a')).toBe(true)
    expect(objectHasAttributes({ a: 1 }, 'toString')).toBe(false)
    expect(objectHasAttributes({ hasOwnProperty: () => true }, 'a')).toBe(false)
  })
})

describe('replaceWhiteSpace', () => {
  it('replaces each whitespace character with the replacement value', () => {
    expect(replaceWhiteSpace('a b  c', '_')).toBe('a_b__c')
  })

  it('removes whitespace when the replacement value is empty', () => {
    expect(replaceWhiteSpace('a b  c', '')).toBe('abc')
  })
})
