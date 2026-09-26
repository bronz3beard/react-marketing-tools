// Prints the SLSA provenance inside a Sigstore bundle as one line of in-toto JSON Lines (`*.intoto.jsonl`).
//
// `actions/attest` signs the release tarball and SBOM and writes a Sigstore bundle: a signed DSSE envelope plus the
// certificate and transparency-log proof. The Release workflow attaches that bundle as `*.sigstore.json`, which is
// what `gh attestation verify` checks. It also attaches the envelope on its own as `*.intoto.jsonl`, the in-toto
// attestation-bundle format that tools and OpenSSF Scorecard recognise as provenance. This refuses anything that isn't
// a SLSA provenance envelope, so the file can't carry some other attestation under that name.
//
//   node scripts/provenance-envelope.mjs bundle.json > react-marketing-tools-1.0.2.intoto.jsonl
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

const IN_TOTO_PAYLOAD = 'application/vnd.in-toto+json'
const SLSA_PROVENANCE = 'https://slsa.dev/provenance/v1'

export class ProvenanceError extends Error {}

/** The bundle's DSSE envelope as a single JSON line, after checking it holds signed SLSA provenance. */
export const provenanceEnvelope = bundle => {
  const envelope = bundle?.dsseEnvelope
  if (!envelope) {
    throw new ProvenanceError('the bundle has no dsseEnvelope')
  }
  if (envelope.payloadType !== IN_TOTO_PAYLOAD) {
    throw new ProvenanceError(
      `payloadType is "${envelope.payloadType}", not "${IN_TOTO_PAYLOAD}"`,
    )
  }
  if (!Array.isArray(envelope.signatures) || envelope.signatures.length === 0) {
    throw new ProvenanceError('the envelope is not signed')
  }

  let statement
  try {
    statement = JSON.parse(Buffer.from(envelope.payload, 'base64').toString())
  } catch {
    throw new ProvenanceError('the envelope payload is not base64 JSON')
  }
  if (statement.predicateType !== SLSA_PROVENANCE) {
    throw new ProvenanceError(
      `predicateType is "${statement.predicateType}", not "${SLSA_PROVENANCE}"`,
    )
  }

  return JSON.stringify(envelope)
}

// Run only as a script, so the test can import provenanceEnvelope.
if (process.argv[1]?.endsWith('provenance-envelope.mjs')) {
  const path = process.argv[2]
  try {
    if (!path) {
      throw new ProvenanceError(
        'usage: node scripts/provenance-envelope.mjs <sigstore-bundle.json>',
      )
    }
    console.log(provenanceEnvelope(JSON.parse(readFileSync(path, 'utf8'))))
  } catch (error) {
    console.error(
      `FAIL ${error instanceof ProvenanceError ? error.message : error}`,
    )
    process.exitCode = 1
  }
}
