import { assertIsTrue } from '../utilities/assertValueCheckers'
import { BuildConfigOptions, Config, Platform } from './types'

export const analyticsPlatform: Platform = {
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  DATALAYER_PUSH: 'DATALAYER_PUSH',
}

export const showMeBuildInAnalyticsPlatform = (): void => {
  const platformList = []

  for (const item in analyticsPlatform) {
    platformList.push({ [item]: `"${analyticsPlatform[item]}"` })
  }

  console.group()
  console.info('BuildInAnalyticsPlatform')
  console.table(platformList)
  console.groupEnd()
}

export const analyticsEventActionPrefixList: Record<string, string> = {
  JOURNEY: 'J',
  INTERACTION: 'I',
}

export const showMeBuildInEventActionPrefixList = (): void => {
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

export const analyticsGlobalEventActionList: Record<string, string> = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATED: 'AUTHENTICATED',
  MENU_ACTIVE: 'MENU_ACTIVE',
  MENU_INACTIVE: 'MENU_INACTIVE',
}

export const showMeBuildInGlobalEventActionList = (): void => {
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

export let config: Config = {} as unknown as Config



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
    includeUserKeys,
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

export { buildConfig }
