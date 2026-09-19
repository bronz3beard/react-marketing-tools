export type DemoIds = { gtm?: string; ga4?: string; metaPixel?: string }

/** The formats the library accepts, used by the form's validation and to ignore bad saved values. */
export const ID_FIELDS = [
  {
    key: 'gtm',
    label: 'Tag Manager container ID',
    format: 'GTM-XXXXXXX',
    pattern: 'GTM-[A-Z0-9]+',
  },
  {
    key: 'ga4',
    label: 'GA4 measurement ID',
    format: 'G-XXXXXXXXXX',
    pattern: 'G-[A-Z0-9]+',
  },
  {
    key: 'metaPixel',
    label: 'Meta Pixel ID',
    format: 'digits only',
    pattern: '[0-9]+',
  },
] as const

const STORAGE_KEY = 'rmt-demo:ids'

const isValid = (key: keyof DemoIds, value: unknown): value is string => {
  const field = ID_FIELDS.find(candidate => candidate.key === key)
  return (
    typeof value === 'string' &&
    field !== undefined &&
    new RegExp(`^(?:${field.pattern})$`).test(value)
  )
}

/** IDs saved in this browser, if any. Storage can be blocked; the playground then uses placeholders. */
export const loadIds = (): DemoIds => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return Object.fromEntries(
      ID_FIELDS.flatMap(({ key }) => {
        const value = (saved as Record<string, unknown> | null)?.[key]
        return isValid(key, value) ? [[key, value]] : []
      }),
    )
  } catch {
    return {}
  }
}

/** Keeps the IDs in this browser only. Returns false when the browser blocks storage. */
export const saveIds = (ids: DemoIds): boolean => {
  try {
    if (Object.keys(ids).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    return true
  } catch {
    return false
  }
}

export const hasOwnIds = (ids: DemoIds): boolean => Object.keys(ids).length > 0
