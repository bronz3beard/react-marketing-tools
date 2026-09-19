/**
 * Reads one cookie from a `document.cookie` string or an HTTP `Cookie` header. Values are returned as stored; an
 * `=` inside a value is kept.
 */
export const parseCookie = (
  cookies: string,
  name: string,
): string | undefined => {
  for (const pair of cookies.split(';')) {
    const separator = pair.indexOf('=')
    if (separator !== -1 && pair.slice(0, separator).trim() === name) {
      return pair.slice(separator + 1).trim()
    }
  }
  return undefined
}
