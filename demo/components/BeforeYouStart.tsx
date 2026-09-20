const NEEDS = [
  {
    service: 'Google Tag Manager',
    need: 'a container (GTM-XXXXXXX), plus the tags and triggers that decide what happens to each event',
    note: 'The library puts events in the dataLayer; your container does the rest, so an event with no trigger goes nowhere.',
  },
  {
    service: 'Google Analytics 4',
    need: 'a property with a web data stream (G-XXXXXXX)',
    note: 'Events arrive under the name you track. Google’s recommended names fill in the built-in reports.',
  },
  {
    service: 'Meta Pixel',
    need: 'a dataset (pixel) ID from Events Manager',
    note: 'Only needed if you advertise on Facebook or Instagram.',
  },
  {
    service: 'Events sent from your server',
    need: 'a GA4 API secret, and a Meta Conversions API access token',
    note: 'Both stay on your server, never in the browser.',
  },
]

export const BeforeYouStart = () => (
  <section className="panel" aria-labelledby="assumes-title">
    <h2 id="assumes-title">What this assumes you already have</h2>
    <p className="hint">
      The library sends events to accounts you set up yourself; it doesn't
      create or configure them. Set up the services you want, then give the
      library their IDs.
    </p>
    <dl className="needs">
      {NEEDS.map(({ service, need, note }) => (
        <div key={service}>
          <dt>{service}</dt>
          <dd>
            {need}
            <small>{note}</small>
          </dd>
        </div>
      ))}
    </dl>
    <p className="hint">
      This playground uses placeholder IDs, so you can see every call without an
      account. Add your own under <strong>Try your own IDs</strong> to load the
      real scripts.
    </p>
  </section>
)
