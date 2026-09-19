import { describe, expect, it } from 'vitest'
import { hashString, replaceWhiteSpace } from './commonFunctions'

describe('hashString', () => {
  it('returns the SHA-256 hex digest of the input', async () => {
    expect(await hashString('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
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
