import type { AnalyticsEvent, EventParams } from '../core/types.js'

// https://developers.facebook.com/docs/meta-pixel/reference
const META_STANDARD_EVENTS = new Set([
  'AddPaymentInfo',
  'AddToCart',
  'AddToWishlist',
  'CompleteRegistration',
  'Contact',
  'CustomizeProduct',
  'Donate',
  'FindLocation',
  'InitiateCheckout',
  'Lead',
  'PageView',
  'Purchase',
  'Schedule',
  'Search',
  'StartTrial',
  'SubmitApplication',
  'Subscribe',
  'ViewContent',
])

/** GA4 recommended event → the Meta standard event with the same meaning. */
export const GA4_TO_META_EVENT: Readonly<Record<string, string>> = {
  purchase: 'Purchase',
  sign_up: 'CompleteRegistration',
  generate_lead: 'Lead',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  view_item: 'ViewContent',
  search: 'Search',
  add_payment_info: 'AddPaymentInfo',
  add_to_wishlist: 'AddToWishlist',
}

type Content = { id: string; quantity: number }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// GA4 ecommerce items → Meta's content fields. Meta documents `id` and `quantity` for each entry of `contents`.
const toContentParams = (items: unknown[]): EventParams => {
  const contents: Content[] = items
    .filter(isRecord)
    .filter(item => item.item_id !== undefined)
    .map(item => ({
      id: String(item.item_id),
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
    }))

  return {
    content_ids: contents.map(content => content.id),
    contents,
    num_items: contents.reduce((total, content) => total + content.quantity, 0),
    content_type: 'product',
  }
}

/** GA4-style params → Meta standard params; everything else passes through. */
export const toMetaParams = ({
  items,
  search_term: searchTerm,
  ...rest
}: EventParams): EventParams => ({
  ...rest,
  ...(typeof searchTerm === 'string' ? { search_string: searchTerm } : {}),
  ...(Array.isArray(items) ? toContentParams(items) : {}),
})

export type MetaCall = {
  command: 'track' | 'trackCustom'
  name: string
  params: EventParams
}

/** How an event reaches the Pixel: a standard event through `track`, anything else through `trackCustom`. */
export const toMetaCall = ({
  name,
  params,
  options,
}: AnalyticsEvent): MetaCall => {
  const override = options?.meta
  const metaName = override?.event ?? GA4_TO_META_EVENT[name] ?? name

  return {
    command: META_STANDARD_EVENTS.has(metaName) ? 'track' : 'trackCustom',
    name: metaName,
    params: { ...toMetaParams(params), ...override?.params },
  }
}
