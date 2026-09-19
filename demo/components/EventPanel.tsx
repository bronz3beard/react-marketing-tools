import { useAnalytics } from 'react-marketing-tools'

const TSHIRT = {
  item_id: 'sku_1',
  item_name: 'T-shirt',
  price: 30,
  quantity: 1,
}

export const EventPanel = () => {
  const { track, page, identify, reset } = useAnalytics()

  const events = [
    {
      label: 'Sign up',
      send: () => track('sign_up', { method: 'google' }),
    },
    {
      label: 'View item',
      send: () =>
        track('view_item', { currency: 'USD', value: 30, items: [TSHIRT] }),
    },
    {
      label: 'Add to cart',
      send: () =>
        track('add_to_cart', { currency: 'USD', value: 30, items: [TSHIRT] }),
    },
    {
      label: 'Purchase',
      send: () =>
        track('purchase', {
          transaction_id: 'T-1001',
          currency: 'USD',
          value: 30,
          items: [TSHIRT],
        }),
    },
    {
      label: 'Generate lead',
      send: () => track('generate_lead', { currency: 'USD', value: 10 }),
    },
    { label: 'Custom event', send: () => track('newsletter_open') },
    { label: 'Page view', send: () => page() },
  ]

  return (
    <section className="panel" aria-labelledby="events-title">
      <h2 id="events-title">Track events</h2>
      <div className="button-grid">
        {events.map(({ label, send }) => (
          <button key={label} type="button" onClick={send}>
            {label}
          </button>
        ))}
        <button
          type="button"
          data-analytics-event="cta_click"
          data-analytics-param-location="playground"
        >
          Autocaptured click
        </button>
      </div>
      <p className="hint">
        The last button has no click handler: <code>autocapture</code> tracks it
        from its <code>data-analytics-*</code> attributes.
      </p>

      <h3>User</h3>
      <div className="button-grid">
        <button
          type="button"
          onClick={() => identify('user-42', { email: 'ada@example.com' })}
        >
          Sign in as user-42
        </button>
        <button type="button" onClick={() => reset()}>
          Sign out
        </button>
      </div>
    </section>
  )
}
