import { isSha256Hex, sha256Hex } from '../shared/hash.js'

export type ConversionsApiUserData = {
  email?: string
  /** Include the country code, e.g. `+44 7700 900123`. */
  phone?: string
  firstName?: string
  lastName?: string
  /** Your own user ID. */
  externalId?: string
  /** The visitor's IP address, e.g. from your request. */
  clientIpAddress?: string
  /** The visitor's User-Agent header. */
  clientUserAgent?: string
  /** Meta click ID (`_fbc` cookie, or `getAttribution().fbc`). */
  fbc?: string
  /** Meta browser ID (`_fbp` cookie, or `getAttribution().fbp`). */
  fbp?: string
}

// Meta's normalisation before hashing:
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}]/gu, '')

const HASHED_FIELDS = {
  em: {
    from: 'email',
    normalize: (value: string) => value.trim().toLowerCase(),
  },
  ph: {
    from: 'phone',
    normalize: (value: string) => value.replace(/\D/g, '').replace(/^0+/, ''),
  },
  fn: { from: 'firstName', normalize: normalizeName },
  ln: { from: 'lastName', normalize: normalizeName },
  external_id: {
    from: 'externalId',
    normalize: (value: string) => value.trim(),
  },
} as const satisfies Record<
  string,
  { from: keyof ConversionsApiUserData; normalize: (value: string) => string }
>

// Meta: "Do not hash" these.
const PLAIN_FIELDS = {
  client_ip_address: 'clientIpAddress',
  client_user_agent: 'clientUserAgent',
  fbc: 'fbc',
  fbp: 'fbp',
} as const satisfies Record<string, keyof ConversionsApiUserData>

/** Meta `user_data`: identifiers normalised and SHA-256 hashed (already-hashed values kept), browser signals as they are. */
export const toMetaUserData = async (
  userData: ConversionsApiUserData,
): Promise<Record<string, string>> => {
  const hashed = await Promise.all(
    Object.entries(HASHED_FIELDS).map(async ([field, { from, normalize }]) => {
      const value = userData[from]
      if (!value) return []
      if (isSha256Hex(value)) return [[field, value] as const]
      const normalized = normalize(value)
      return normalized ? [[field, await sha256Hex(normalized)] as const] : []
    }),
  )
  const plain = Object.entries(PLAIN_FIELDS).flatMap(([field, from]) =>
    userData[from] ? [[field, userData[from]] as const] : [],
  )
  return Object.fromEntries([...hashed.flat(), ...plain])
}
