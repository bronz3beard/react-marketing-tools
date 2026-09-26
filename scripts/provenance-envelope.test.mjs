import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { provenanceEnvelope } from './provenance-envelope.mjs'

// The shape actions/attest writes (Sigstore bundle v0.3), trimmed to the fields that matter here.
const bundleWith = ({
  payloadType = 'application/vnd.in-toto+json',
  predicateType = 'https://slsa.dev/provenance/v1',
  signatures = [{ sig: 'MEUCIQ...' }],
  payload = Buffer.from(
    JSON.stringify({
      _type: 'https://in-toto.io/Statement/v1',
      subject: [{ name: 'react-marketing-tools-1.0.2.tgz' }],
      predicateType,
      predicate: {},
    }),
  ).toString('base64'),
} = {}) => ({
  mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
  verificationMaterial: { certificate: {} },
  dsseEnvelope: { payload, payloadType, signatures },
})

describe('extracting the provenance envelope from a Sigstore bundle', () => {
  it('returns the signed envelope as one JSON line', () => {
    const bundle = bundleWith()
    const line = provenanceEnvelope(bundle)

    expect(line).not.toContain('\n')
    expect(JSON.parse(line)).toEqual(bundle.dsseEnvelope)
  })

  it('refuses an attestation that is not SLSA provenance', () => {
    expect(() =>
      provenanceEnvelope(
        bundleWith({
          predicateType: 'https://in-toto.io/attestation/release/v0.2',
        }),
      ),
    ).toThrow('predicateType is "https://in-toto.io/attestation/release/v0.2"')
  })

  it('refuses a payload that is not an in-toto statement', () => {
    expect(() =>
      provenanceEnvelope(bundleWith({ payloadType: 'text/plain' })),
    ).toThrow('payloadType is "text/plain"')
  })

  it('refuses an unsigned envelope', () => {
    expect(() => provenanceEnvelope(bundleWith({ signatures: [] }))).toThrow(
      'not signed',
    )
  })

  it('refuses a payload that does not decode to JSON', () => {
    expect(() =>
      provenanceEnvelope(bundleWith({ payload: 'not base64 json' })),
    ).toThrow('not base64 JSON')
  })

  it('refuses a bundle without an envelope', () => {
    expect(() => provenanceEnvelope({ messageSignature: {} })).toThrow(
      'no dsseEnvelope',
    )
  })
})
