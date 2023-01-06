import { useMemo, createContext, useContext, ReactNode, Provider } from 'react'
import {
  config,
  analyticsPlatform,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInEventActionPrefixList,
  showMeBuildInGlobalEventActionList,
} from './buildConfig'
import { trackAnalyticsEvent } from './analytics/analyticsEventService'
import { assertIsTrue } from './utilities/assertValueCheckers'
import { Platform, TrackAnalyticsEventOptions } from './types'

// for usage without the react context/provider aka use directly
export { buildConfig, analyticsPlatform } from './buildConfig'
export { trackAnalyticsEvent } from './analytics/analyticsEventService'
//

export type ProviderStateProps = {
  appName: string
  appSessionCookieName: string
  analyticsPlatform: Platform
  eventActionPrefixList: Record<string, string>
  analyticsGlobalEventActionList: Record<string, string>
}

export type ProviderApiProps = {
  trackAnalyticsEvent: (options: TrackAnalyticsEventOptions) => Promise<void>
  showMeBuildInAnalyticsPlatform: () => void
  showMeBuildInEventActionPrefixList: () => void
  showMeBuildInGlobalEventActionList: () => void
}

export const ContextState = createContext<ProviderStateProps>(
  {} as unknown as ProviderStateProps,
)
export const ContextApi = createContext<ProviderApiProps>(
  {} as unknown as ProviderApiProps,
)

const ProviderState: Provider<ProviderStateProps> = ContextState.Provider
const ProviderApi: Provider<ProviderApiProps> = ContextApi.Provider

type ReactMarketingProviderProps = {
  children: ReactNode
}
export const ReactMarketingProvider = ({
  children,
}: ReactMarketingProviderProps) => {
  const api = useMemo<ProviderApiProps>(
    () => ({
      trackAnalyticsEvent,
      showMeBuildInAnalyticsPlatform,
      showMeBuildInEventActionPrefixList,
      showMeBuildInGlobalEventActionList,
    }),
    [trackAnalyticsEvent],
  )

  const stateValue = useMemo(
    () => ({
      analyticsPlatform,
      appName: config.appName,
      appSessionCookieName: config.appSessionCookieName,
      eventActionPrefixList: config.eventActionPrefixList,
      analyticsGlobalEventActionList: config.analyticsGlobalEventActionList,
    }),
    [config, analyticsPlatform],
  )

  return (
    <ProviderState value={stateValue}>
      <ProviderApi value={api}>{children}</ProviderApi>
    </ProviderState>
  )
}

/**
 * @property {string} appName
 * @property {string} appSessionCookieName
 * @property {object} analyticsPlatform
 * @property {object} eventActionPrefixList
 * @property {object} analyticsGlobalEventActionList
 */
export const useMarketingState = (): ProviderStateProps => {
  const ctx = useContext(ContextState)
  assertIsTrue(!!ctx, 'useAppState must be used within the AppProvider')

  return ctx
}

/**
 * @property {function} trackAnalyticsEvent(options)
 * @property {function} showMeBuildInAnalyticsPlatform
 * @property {function} showMeBuildInEventActionPrefixList
 * @property {function} showMeBuildInGlobalEventActionList
 */
export const useMarketingApi = (): ProviderApiProps => {
  const ctx = useContext(ContextApi)
  assertIsTrue(!!ctx, 'useAppApi must be used within the AppProvider')

  return ctx
}
