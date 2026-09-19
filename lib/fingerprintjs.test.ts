import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fingerprintjs } from './fingerprintjs.js'

const get = vi.fn(() => Promise.resolve({ visitorId: 'fp-abc' }))
const load = vi.fn(() => Promise.resolve({ get }))

vi.mock('@fingerprintjs/fingerprintjs', () => ({ load }))

describe('fingerprintjs()', () => {
  beforeEach(() => {
    load.mockClear()
    get.mockClear()
  })

  it('doesn’t load FingerprintJS until the visitor ID is asked for', () => {
    fingerprintjs()

    expect(load).not.toHaveBeenCalled()
  })

  it('returns FingerprintJS’s visitor ID, with its statistics request turned off', async () => {
    await expect(fingerprintjs()()).resolves.toBe('fp-abc')

    expect(load).toHaveBeenCalledWith({ monitoring: false })
  })
})
