import { useAnalytics } from 'react-marketing-tools'

const LINKS = [
  {
    label: 'Newsletter campaign',
    query: '?utm_source=newsletter&utm_medium=email&utm_campaign=autumn_sale',
  },
  {
    label: 'Google Ads click',
    query: '?utm_source=google&utm_medium=cpc&gclid=demo-gclid-123',
  },
  {
    label: 'Meta ad click',
    query: '?utm_source=facebook&utm_medium=paid_social&fbclid=demo-fbclid-123',
  },
]

export const CampaignPanel = () => {
  const { getAttribution } = useAnalytics()
  // Read on every render, so it follows consent changes made elsewhere on the page.
  const attribution = getAttribution()

  return (
    <section className="panel" aria-labelledby="campaign-title">
      <h2 id="campaign-title">Campaign links</h2>
      <p className="hint">
        Open the playground as if from a campaign. The first touch stays; the
        last touch follows the latest link. Events sent to Tag Manager then
        carry the last touch as <code>attribution</code>.
      </p>
      <ul className="link-list">
        {LINKS.map(({ label, query }) => (
          <li key={label}>
            <a href={query}>{label}</a>
          </li>
        ))}
      </ul>
      <h3>
        <code>getAttribution()</code>
      </h3>
      <pre>
        <code>{JSON.stringify(attribution, null, 2)}</code>
      </pre>
    </section>
  )
}
