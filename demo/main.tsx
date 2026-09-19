import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'react-marketing-tools'
import { createDemo } from './analytics'
import { App } from './App'
import './styles.css'

const { analytics, inspector } = createDemo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnalyticsProvider analytics={analytics}>
      <App inspector={inspector} />
    </AnalyticsProvider>
  </StrictMode>,
)
