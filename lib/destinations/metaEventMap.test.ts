import { describe, expect, it } from 'vitest'
import type { AnalyticsEvent } from '../core/types.js'
import { GA4_TO_META_EVENT, toMetaCall, toMetaParams } from './metaEventMap.js'

const event = (overrides: Partial<AnalyticsEvent>): AnalyticsEvent => ({
  name: 'x',
  params: {},
  eventId: 'id',
  timestamp: 0,
  ...overrides,
})

describe('toMetaCall', () => {
  it.each(Object.entries(GA4_TO_META_EVENT))(
    'sends %s as the Meta standard event %s',
    (ga4Name, metaName) => {
      expect(toMetaCall(event({ name: ga4Name }))).toMatchObject({
        command: 'track',
        name: metaName,
      })
    },
  )

  it('sends other events as custom events with their own name', () => {
    expect(toMetaCall(event({ name: 'newsletter_open' }))).toEqual({
      command: 'trackCustom',
      name: 'newsletter_open',
      params: {},
    })
  })

  it('uses a per-call override, merging its params over the mapped ones', () => {
    expect(
      toMetaCall(
        event({
          name: 'lead_form',
          params: { form: 'demo' },
          options: {
            meta: { event: 'Lead', params: { content_category: 'b2b' } },
          },
        }),
      ),
    ).toEqual({
      command: 'track',
      name: 'Lead',
      params: { form: 'demo', content_category: 'b2b' },
    })
  })

  it('sends an overridden non-standard name as a custom event', () => {
    expect(
      toMetaCall(event({ options: { meta: { event: 'QuizFinished' } } })),
    ).toMatchObject({ command: 'trackCustom', name: 'QuizFinished' })
  })
})

describe('toMetaParams', () => {
  it('turns GA4 ecommerce items into Meta content fields', () => {
    expect(
      toMetaParams({
        value: 42,
        currency: 'USD',
        items: [
          { item_id: 'sku1', quantity: 2 },
          { item_id: 'sku2' },
          { item_name: 'no id, skipped' },
        ],
      }),
    ).toEqual({
      value: 42,
      currency: 'USD',
      content_ids: ['sku1', 'sku2'],
      contents: [
        { id: 'sku1', quantity: 2 },
        { id: 'sku2', quantity: 1 },
      ],
      num_items: 3,
      content_type: 'product',
    })
  })

  it('renames search_term to Meta’s search_string', () => {
    expect(toMetaParams({ search_term: 'boots' })).toEqual({
      search_string: 'boots',
    })
  })

  it('passes other params through unchanged', () => {
    expect(toMetaParams({ method: 'google' })).toEqual({ method: 'google' })
  })
})
