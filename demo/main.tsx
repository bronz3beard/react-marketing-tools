import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'react-marketing-tools'
import { createDemo } from './analytics'
import { App } from './App'
import { loadIds, saveIds, type DemoIds } from './ids'
import './styles.css'

const ids = loadIds()
const { analytics, inspector } = createDemo(ids)

// Vendor scripts can't be unloaded, so switching IDs starts a fresh page.
const saveAndReload = (next: DemoIds) => {
  if (!saveIds(next)) return false
  location.reload()
  return true
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnalyticsProvider analytics={analytics}>
      <App inspector={inspector} ids={ids} onSaveIds={saveAndReload} />
    </AnalyticsProvider>
  </StrictMode>,
)
