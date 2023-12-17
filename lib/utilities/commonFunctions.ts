export const isClientSide = (): boolean => typeof window !== 'undefined'

export const objectHasAttributes = (obj: Record<any, any>, key = ''): boolean =>
  !key ? Object.keys(obj).length > 0 : obj.hasOwnProperty(key)

export const replaceWhiteSpace = (
  stringValue: string,
  replaceValue: string,
): string =>
  replaceValue
    ? stringValue.replace(/[\s]/g, replaceValue)
    : stringValue.replace(/[\s]+/g, '')

export const checkAllArrayValuesReturnTrue = (
  valueArray: boolean[],
): boolean => {
  const checkIsTrue = (value: boolean) => value !== false

  return valueArray.every(checkIsTrue)
}

// NOTE:: this hashString is the FE equivalent of the BE hashString function
// For the purpose of analytics we don't need to be able to decrypt,
// reference: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
// NOTE:: Maybe a better option for integrating string hashing and encryption: https://www.npmjs.com/package/crypto-js

export const hashString = async (value: string): Promise<string> => {
  const utf8 = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map(bytes => bytes.toString(16).padStart(2, '0'))
    .join('')

  return hashHex
}
