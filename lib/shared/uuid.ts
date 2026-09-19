// crypto.randomUUID only exists in secure contexts (HTTPS, localhost); plain-HTTP pages fall back to getRandomValues.
export const randomUuid = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, digit =>
        (
          Number(digit) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] &
            (15 >> (Number(digit) / 4)))
        ).toString(16),
      )
