import {
  createContext,
  useContext,
  useEffect,
  type ReactElement,
  type ReactNode,
} from 'react'
import type { Analytics } from '../core/types.js'

const AnalyticsContext = createContext<Analytics | null>(null)

type AnalyticsProviderProps = {
  analytics: Analytics
  children: ReactNode
}

/** Makes `analytics` available to `useAnalytics()` and starts it once the app has mounted in the browser. */
export const AnalyticsProvider = ({
  analytics,
  children,
}: AnalyticsProviderProps): ReactElement => {
  // start() is idempotent, so StrictMode running this effect twice is harmless. Children's mount effects run first;
  // their calls are queued and delivered here.
  useEffect(() => {
    analytics.start()
  }, [analytics])

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const useAnalytics = (): Analytics => {
  const analytics = useContext(AnalyticsContext)
  if (!analytics) {
    throw new Error(
      '[react-marketing-tools] useAnalytics must be used within <AnalyticsProvider>',
    )
  }
  return analytics
}
