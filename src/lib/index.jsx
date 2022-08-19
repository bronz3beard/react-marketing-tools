import { useMemo, createContext, useContext } from 'react'
import { func, shape, string } from 'prop-types'
import {
  config,
  analyticsPlatform,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInEventActionPrefixList,
  showMeBuildInGlobalEventActionList,
} from './buildConfig'
import { trackAnalyticsEvent } from './analytics/analyticsEventService'
import { assertIsTrue } from './utilities/assertValueCheckers'

// for usage without the react context/provider aka use directly
export { buildConfig, analyticsPlatform } from './buildConfig'
export { trackAnalyticsEvent } from './analytics/analyticsEventService'
//

export const ContextState = createContext({})
export const ContextApi = createContext({})

const ProviderState = ContextState.Provider
ProviderState.propTypes = {
  analyticsPlatform: shape({
    GOOGLE: string,
    FACEBOOK: string,
    DATALAYER_PUSH: string,
  }),
  eventActionPrefixList: shape({}),
  analyticsGlobalEventActionList: shape({}),
}

const ProviderApi = ContextApi.Provider
ProviderApi.propTypes = {
  trackAnalyticsEvent: func,
  showMeBuildInAnalyticsPlatform: func,
  showMeBuildInEventActionPrefixList: func,
  showMeBuildInGlobalEventActionList: func,
}

export const ReactMarketingProvider = ({ children }) => {
  const api = useMemo(
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
 * @property {object} analyticsPlatform
 * @property {object} eventActionPrefixList
 * @property {object} analyticsGlobalEventActionList
 */
export const useMarketingState = () => {
  const ctx = useContext(ContextState)
  assertIsTrue(ctx, 'useAppState must be used within the AppProvider')

  return ctx
}

/**
 * @property {function} trackAnalyticsEvent(options)
 * @arg {object} data this is an object of any data you want to collect in analytics
 * @arg {object} eventNameInfo
 * @arg {string} analyticsType
 * @arg {array | null} userDataToHashKeyArray default for this value is null, when used it should include an array of strings you wish to hash.
 * @arg {boolean} dataLayerCheck
 * @arg {object} consoleLogData (optional) is an object with the following attributes, "showGlobalVars", "showJourneyPropsPayload", "showUserProps" if any of the values are true you will be able to see the respective payload in your console.
 * @property {function} showMeBuildInAnalyticsPlatform
 * @property {function} showMeBuildInEventActionPrefixList
 * @property {function} showMeBuildInGlobalEventActionList
 */
export const useMarketingApi = () => {
  const ctx = useContext(ContextApi)
  assertIsTrue(ctx, 'useAppApi must be used within the AppProvider')

  return ctx
}
