import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isSha256Hex, sha256Hex } from './hash.js'

describe('sha256Hex', () => {
  it.each([
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ])('hashes %j to the standard test vector', async (value, expected) => {
    expect(await sha256Hex(value)).toBe(expected)
  })

  it('hashes UTF-8 text the same way as Node’s crypto module', async () => {
    const value = 'zoë müller'
    expect(await sha256Hex(value)).toBe(
      createHash('sha256').update(value, 'utf8').digest('hex'),
    )
  })
})

describe('isSha256Hex', () => {
  it('recognises a lowercase SHA-256 hex digest only', () => {
    expect(
      isSha256Hex(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    ).toBe(true)
    expect(
      isSha256Hex(
        'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD',
      ),
    ).toBe(false)
    expect(isSha256Hex('a@b.com')).toBe(false)
  })
})
