import { useState } from 'react'
import { useAnalytics, type ConsentUpdate } from 'react-marketing-tools'
import { BeforeYouStart } from './components/BeforeYouStart'
import { CampaignPanel } from './components/CampaignPanel'
import { ConsentPanel } from './components/ConsentPanel'
import { EventPanel } from './components/EventPanel'
import { IdsForm } from './components/IdsForm'
import { Inspector } from './components/Inspector'
import { JourneyStepper } from './components/JourneyStepper'
import { SnippetDialog } from './components/SnippetDialog'
import { VisitorIdPanel } from './components/VisitorIdPanel'
import { hasOwnIds, type DemoIds } from './ids'
import type { Inspector as InspectorStore } from './inspector'

const REPO = 'https://github.com/bronz3beard/react-marketing-tools'

export const App = ({
  inspector,
  ids,
  onSaveIds,
}: {
  inspector: InspectorStore
  ids: DemoIds
  /** Keeps the IDs and reloads with them; returns false when they couldn't be kept. */
  onSaveIds: (ids: DemoIds) => boolean
}) => {
  const { consent } = useAnalytics()
  const [consentState, setConsentState] = useState(consent.get)

  const changeConsent = (update: ConsentUpdate) => {
    consent.update(update)
    // `ads` also moves the purposes that follow it, so read the whole state back.
    setConsentState(consent.get())
  }

  return (
    <>
      <header className="site-header">
        <h1>React Marketing Tools playground</h1>
        <p>
          Track events and change consent, and see exactly what Google Tag
          Manager, Google Analytics 4, the Meta Pixel and the Conversions API
          relay receive.{' '}
          {hasOwnIds(ids)
            ? 'Your IDs are in use, so their vendor scripts are loaded and events reach your accounts.'
            : "Nothing is sent: vendor scripts aren't loaded."}{' '}
          The relay's requests stay on this page.
        </p>
        <nav aria-label="Project links">
          <a href={REPO}>GitHub</a>
          <a href={`${REPO}/blob/main/docs/getting-started.md`}>Docs</a>
          <a href="https://www.npmjs.com/package/react-marketing-tools">npm</a>
        </nav>
      </header>
      <main className="layout">
        <div className="controls">
          <BeforeYouStart />
          <EventPanel />
          <JourneyStepper />
          <ConsentPanel state={consentState} onChange={changeConsent} />
          <VisitorIdPanel consent={consentState} />
          <CampaignPanel />
          <IdsForm ids={ids} onSave={onSaveIds} />
          <SnippetDialog ids={ids} />
        </div>
        <Inspector inspector={inspector} />
      </main>
    </>
  )
}
