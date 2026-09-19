import { ConsentPanel } from './components/ConsentPanel'
import { EventPanel } from './components/EventPanel'
import { Inspector } from './components/Inspector'
import type { Inspector as InspectorStore } from './inspector'

const REPO = 'https://github.com/bronz3beard/react-marketing-tools'

export const App = ({ inspector }: { inspector: InspectorStore }) => (
  <>
    <header className="site-header">
      <h1>React Marketing Tools playground</h1>
      <p>
        Track events and change consent, and see exactly what Google Tag
        Manager, Google Analytics 4, the Meta Pixel and the Conversions API
        relay receive. Nothing is sent: vendor scripts aren't loaded, and the
        relay's requests stay on this page.
      </p>
      <nav aria-label="Project links">
        <a href={REPO}>GitHub</a>
        <a href={`${REPO}/blob/main/docs/getting-started.md`}>Docs</a>
        <a href="https://www.npmjs.com/package/react-marketing-tools">npm</a>
      </nav>
    </header>
    <main className="layout">
      <div className="controls">
        <EventPanel />
        <ConsentPanel />
      </div>
      <Inspector inspector={inspector} />
    </main>
  </>
)
