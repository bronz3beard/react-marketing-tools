import {
  useMemo,
  createContext,
  useContext,
  ReactNode,
  Provider,
  Context,
} from 'react'
import { trackAnalyticsEvent } from './analytics/analyticsEventService'
import { assertIsTrue } from './utilities/assertValueCheckers'
import type { ProviderStateProps, ProviderApiProps } from './types'
import {
  analyticsPlatform,
  config,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInEventActionPrefixList,
  showMeBuildInGlobalEventActionList,
} from './buildConfig'

export * from './types'
// for usage without the react context/provider aka use directly
export {
  config,
  analyticsPlatform,
  buildConfig,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInGlobalEventActionList,
  showMeBuildInEventActionPrefixList,
} from './buildConfig'
export { trackAnalyticsEvent } from './analytics/analyticsEventService'
//

export const ContextState: Context<ProviderStateProps> =
  createContext<ProviderStateProps>({} as unknown as ProviderStateProps)
export const ContextApi: Context<ProviderApiProps> =
  createContext<ProviderApiProps>({} as unknown as ProviderApiProps)

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

  const stateValue: ProviderStateProps = useMemo(
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
