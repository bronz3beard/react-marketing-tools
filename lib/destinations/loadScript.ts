export const isScriptOnPage = (src: string): boolean =>
  Array.from(document.scripts).some(script => script.src === src)

/** Appends an async vendor script, carrying the page's CSP nonce when there is one. */
export const injectScript = ({
  src,
  nonce,
}: {
  src: string
  nonce?: string
}): void => {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  if (nonce) script.setAttribute('nonce', nonce)
  document.head.append(script)
}
