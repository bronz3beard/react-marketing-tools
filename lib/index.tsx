import {
  useMemo,
  createContext,
  createElement,
  useContext,
  ReactElement,
  ReactNode,
  Provider,
  Context,
} from 'react'
import { trackAnalyticsEvent } from './analytics/analyticsEventService.js'
import { assertIsTrue } from './utilities/assertValueCheckers.js'
import type { ProviderStateProps, ProviderApiProps } from './types/index.js'
import {
  analyticsPlatform,
  config,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInEventActionPrefixList,
  showMeBuildInGlobalEventActionList,
} from './buildConfig/index.js'

export type {
  Event,
  GooglePayload,
  EventNameInfo,
  AllowedTypes,
  TrackAnalyticsEventOptions,
  GlobalVars,
  DataLayer,
  ConsoleLogData,
  AnalyticsTrackerDataOptions,
  HandleDataLayerPushOptions,
  ServerLocationData,
  IpInfo,
  Ga4GoogleAnalyticsEventTracking,
  Platform,
  AnalyticsPlatform,
  Tokens,
  Config,
  BuildConfigOptions,
  ProviderStateProps,
  ProviderApiProps,
  AnalyticsEventActionPrefix,
  AnalyticsGlobalEventAction,
} from './types/index.js'
// for usage without the react context/provider aka use directly
export {
  config,
  analyticsPlatform,
  buildConfig,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInGlobalEventActionList,
  showMeBuildInEventActionPrefixList,
} from './buildConfig/index.js'
export { trackAnalyticsEvent } from './analytics/analyticsEventService.js'
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
}: ReactMarketingProviderProps): ReactElement => {
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
      eventActionPrefixList: {
        JOURNEY: 'J',
        INTERACTION: 'I',
        ...config.eventActionPrefixList,
      },
      analyticsGlobalEventActionList: {
        UNAUTHENTICATED: 'UNAUTHENTICATED',
        AUTHENTICATED: 'AUTHENTICATED',
        ...config.analyticsGlobalEventActionList,
      },
    }),
    [config, analyticsPlatform],
  )

  // createElement instead of JSX: the bundle must not embed React's jsx-runtime, which ties it to the
  // React version it was built with (a React 19 build breaks React 18 apps) and has no UMD global.
  return createElement(
    ProviderState,
    { value: stateValue },
    createElement(ProviderApi, { value: api }, children),
  )
}

/**
 * @property {string} appName
 * @property {string} appSessionCookieName
 * @property {AnalyticsPlatform} analyticsPlatform
 * @property {AnalyticsEventActionPrefix} eventActionPrefixList
 * @property {AnalyticsGlobalEventAction} analyticsGlobalEventActionList
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
