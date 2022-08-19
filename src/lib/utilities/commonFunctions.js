export const isClientSide = () => typeof window !== 'undefined'

/**
 * Check if object is empty.
 * @param {object} obj
 * @param {string} key
 * @returns
 */
export const objectHasAttributes = (obj, key = '') =>
  !key ? Object.keys(obj).length > 0 : obj.hasOwnProperty(key)

/**
 * Replace whitespace with any character or no space
 * @param {string} stringValue
 * @param {string} replaceValue
 * @returns
 */
export const replaceWhiteSpace = (stringValue, replaceValue) =>
  replaceValue
    ? stringValue.replace(/[\s]/g, replaceValue)
    : stringValue.replace(/[\s]+/g, '')

/**
 * Uses JavaScript .every() to iterate over array values and check if all are equal to true.
 * 
 * "every()" a function that accepts up to three arguments.
    The every method calls the predicate function for each element in the array
    until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array.
 * @param {Array} valueArray 
 * @returns 
 */
export const checkAllArrayValuesReturnTrue = valueArray => {
  const checkIsTrue = value => value !== false

  return valueArray.every(checkIsTrue)
}

// NOTE:: this hashString is the FE equivalent of the BE hashString function
// For the purpose of analytics we don't need to be able to decrypt,
// reference: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
// NOTE:: Maybe a better option for integrating string hashing and encryption: https://www.npmjs.com/package/crypto-js

/**
 * For the purpose of analytics we don't need to be able to decrypt
 * This function will hash any string value using "SHA-256"
 * @param {string} value
 * @returns
 */
export const hashString = async value => {
  const utf8 = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map(bytes => bytes.toString(16).padStart(2, '0'))
    .join('')

  return hashHex
}
