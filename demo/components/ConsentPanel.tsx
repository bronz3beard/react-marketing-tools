import type { ConsentState, ConsentUpdate } from 'react-marketing-tools'

const PURPOSES: { key: keyof ConsentState; label: string; detail: string }[] = [
  {
    key: 'analytics',
    label: 'Analytics',
    detail: 'GA4 analytics_storage; attribution and visitor ID storage',
  },
  {
    key: 'ads',
    label: 'Advertising',
    detail: 'ad_storage, and the two below unless set separately',
  },
  {
    key: 'adUserData',
    label: 'Ad user data',
    detail: 'ad_user_data; the Meta Pixel and the relay',
  },
  {
    key: 'adPersonalization',
    label: 'Ad personalisation',
    detail: 'ad_personalization',
  },
]

export const ConsentPanel = ({
  state,
  onChange,
}: {
  state: ConsentState
  onChange: (update: ConsentUpdate) => void
}) => {
  const change = (key: keyof ConsentState, granted: boolean) =>
    onChange({ [key]: granted ? 'granted' : 'denied' })

  return (
    <section className="panel" aria-labelledby="consent-title">
      <h2 id="consent-title">Consent</h2>
      <fieldset>
        <legend className="visually-hidden">Consent purposes</legend>
        {PURPOSES.map(({ key, label, detail }) => (
          <label key={key} className="toggle">
            <input
              type="checkbox"
              checked={state[key] === 'granted'}
              onChange={event => change(key, event.currentTarget.checked)}
            />
            <span>
              {label}
              <small>{detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
