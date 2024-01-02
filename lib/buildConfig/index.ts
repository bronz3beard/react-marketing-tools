import {
  config as localConfig,
  BuildConfigOptions,
  Platform,
  Config,
  AnalyticsPlatform,
  AnalyticsEventActionPrefix,
  AnalyticsGlobalEventAction,
} from '../types'
import { assertIsTrue } from '../utilities/assertValueCheckers'

const analyticsEventActionPrefixList: AnalyticsEventActionPrefix = {
  JOURNEY: 'J',
  INTERACTION: 'I',
}

const analyticsGlobalEventActionList: AnalyticsGlobalEventAction = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATED: 'AUTHENTICATED',
}

const analyticsPlatform: AnalyticsPlatform = {
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  DATALAYER_PUSH: 'DATALAYER_PUSH',
}

const showMeBuildInAnalyticsPlatform = (): void => {
  const platformList = []

  for (const item in analyticsPlatform) {
    platformList.push({ [item]: `"${analyticsPlatform[item as Platform]}"` })
  }

  console.group()
  console.info('BuildInAnalyticsPlatform')
  console.table(platformList)
  console.groupEnd()
}

const showMeBuildInEventActionPrefixList = (): void => {
  const eventActionPrefixList = []

  for (const item in analyticsEventActionPrefixList) {
    eventActionPrefixList.push({
      [item]: `"${analyticsEventActionPrefixList[item]}"`,
    })
  }

  console.group()
  console.info('BuildInEventActionPrefixList')
  console.table(eventActionPrefixList)
  console.groupEnd()
}

const showMeBuildInGlobalEventActionList = (): void => {
  const eventActionList = []

  for (const item in analyticsGlobalEventActionList) {
    eventActionList.push({
      [item]: `"${analyticsGlobalEventActionList[item]}"`,
    })
  }

  console.group()
  console.info('BuildInGlobalEventActionList')
  console.table(eventActionList)
  console.groupEnd()
}

let config: Config = { ...localConfig } as unknown as Config

const buildConfig = (options: BuildConfigOptions): void => {
  const {
    appName,
    appSessionCookieName,
    eventActionPrefix,
    globalEventActionList,
    includeUserKeys,
    showMissingUserAttributesInConsole,
    TOKENS,
    withDeviceInfo = false,
    withServerLocationInfo = false,
  } = { ...options }

  assertIsTrue(!!appName, 'An appName must be provided in the config.')

  config = {
    TOKENS,
    appName,
    appSessionCookieName,
    withDeviceInfo,
    includeUserKeys: includeUserKeys || [],
    showMissingUserAttributesInConsole,
    withServerLocationInfo,
    eventActionPrefixList: {
      ...analyticsEventActionPrefixList,
      ...eventActionPrefix,
    },
    analyticsGlobalEventActionList: {
      ...analyticsGlobalEventActionList,
      ...globalEventActionList,
    },
  }
}

export {
  config,
  analyticsPlatform,
  buildConfig,
  showMeBuildInAnalyticsPlatform,
  showMeBuildInGlobalEventActionList,
  showMeBuildInEventActionPrefixList,
}
