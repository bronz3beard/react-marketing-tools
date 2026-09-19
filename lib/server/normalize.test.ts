import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { toMetaUserData } from './normalize.js'

const sha256 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex')

describe('toMetaUserData', () => {
  it.each([
    ['email', ' Ada@Example.COM ', 'em', 'ada@example.com'],
    ['phone', '+1 (650) 555-1234', 'ph', '16505551234'],
    ['phone', '0044 7700 900123', 'ph', '447700900123'],
    ['firstName', ' Zoë-Ann ', 'fn', 'zoëann'],
    ['lastName', "O'Brien", 'ln', 'obrien'],
    ['externalId', ' user-42 ', 'external_id', 'user-42'],
  ] as const)(
    'normalises %s %j as Meta requires, then hashes it',
    async (trait, value, field, normalized) => {
      expect(await toMetaUserData({ [trait]: value })).toEqual({
        [field]: sha256(normalized),
      })
    },
  )

  it('keeps values that are already SHA-256 hashed', async () => {
    const hashed = sha256('ada@example.com')
    expect(await toMetaUserData({ email: hashed })).toEqual({ em: hashed })
  })

  it('sends browser signals as they are, never hashed', async () => {
    expect(
      await toMetaUserData({
        clientIpAddress: '203.0.113.7',
        clientUserAgent: 'Mozilla/5.0',
        fbc: 'fb.1.1700000000000.IwAR',
        fbp: 'fb.1.1700000000000.123',
      }),
    ).toEqual({
      client_ip_address: '203.0.113.7',
      client_user_agent: 'Mozilla/5.0',
      fbc: 'fb.1.1700000000000.IwAR',
      fbp: 'fb.1.1700000000000.123',
    })
  })

  it('leaves out values that are empty after normalisation', async () => {
    expect(await toMetaUserData({ phone: 'n/a', firstName: '' })).toEqual({})
  })
})
