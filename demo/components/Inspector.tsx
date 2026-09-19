import { useSyncExternalStore } from 'react'
import type {
  CallGroup,
  Inspector as InspectorStore,
  InspectorRow,
} from '../inspector'

const GROUPS: {
  key: CallGroup
  title: string
  format: (call: unknown) => string
}[] = [
  {
    key: 'gtm',
    title: 'Google Tag Manager',
    format: entry => `dataLayer.push(${JSON.stringify(entry, null, 2)})`,
  },
  {
    key: 'gtag',
    title: 'Google Analytics 4 (gtag.js)',
    format: call =>
      `gtag(${(call as unknown[]).map(arg => JSON.stringify(arg, null, 2)).join(', ')})`,
  },
  {
    key: 'pixel',
    title: 'Meta Pixel',
    format: call =>
      `fbq(${(call as unknown[]).map(arg => JSON.stringify(arg, null, 2)).join(', ')})`,
  },
  {
    key: 'relay',
    title: 'Conversions API relay',
    format: body => `POST /api/track\n${JSON.stringify(body, null, 2)}`,
  },
]

/** What the visitor's consent means for a group's calls, when it isn't obvious from the calls themselves. */
const noteFor = (group: CallGroup, row: InspectorRow): string | undefined => {
  if (group === 'gtag' && row.consent?.analytics === 'denied') {
    return 'analytics_storage is denied: Google tags send these without cookies.'
  }
  if (group === 'pixel' && row.consent?.adUserData === 'denied') {
    return 'Consent is revoked: the Pixel holds these until it is granted.'
  }
  return undefined
}

const Row = ({ row }: { row: InspectorRow }) => {
  const groups = GROUPS.filter(({ key }) => row.calls[key].length > 0)
  return (
    <li className="row">
      <h3>
        <code>{row.label}</code>
        {row.eventId && (
          <span className="event-id" title={row.eventId}>
            event_id {row.eventId.slice(0, 8)}
          </span>
        )}
      </h3>
      {groups.length === 0 && <p className="hint">No vendor calls.</p>}
      {groups.map(({ key, title, format }) => (
        <div key={key} className="call-group">
          <h4>{title}</h4>
          <pre>
            <code>{row.calls[key].map(format).join('\n')}</code>
          </pre>
          {noteFor(key, row) && <p className="hint">{noteFor(key, row)}</p>}
        </div>
      ))}
      {row.pixelLive && (
        <p className="hint">
          Your Meta Pixel script is running, so its calls go straight to Meta.
          See them in Events Manager → Test events.
        </p>
      )}
    </li>
  )
}

export const Inspector = ({ inspector }: { inspector: InspectorStore }) => {
  const rows = useSyncExternalStore(inspector.subscribe, inspector.getRows)

  return (
    <section className="panel inspector" aria-labelledby="inspector-title">
      <div className="inspector-header">
        <h2 id="inspector-title">What each vendor receives</h2>
        <button type="button" onClick={inspector.clear}>
          Clear
        </button>
      </div>
      {rows.length === 0 && (
        <p className="hint">Track an event to see the calls it produces.</p>
      )}
      <ol className="rows" aria-live="polite">
        {rows.map(row => (
          <Row key={row.id} row={row} />
        ))}
      </ol>
    </section>
  )
}
