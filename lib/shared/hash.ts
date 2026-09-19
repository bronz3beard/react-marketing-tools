/** SHA-256 of a UTF-8 string, as lowercase hex. Uses Web Crypto, so it runs in browsers, Node.js and edge runtimes. */
export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

const SHA256_HEX = /^[a-f0-9]{64}$/

/** True for a value that is already a SHA-256 hex digest, so it isn't hashed twice. */
export const isSha256Hex = (value: string): boolean => SHA256_HEX.test(value)
