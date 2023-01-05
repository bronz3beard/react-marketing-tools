import { assertIsTrue } from '../utilities/assertValueCheckers'

export const analyticsPlatform = {
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  DATALAYER_PUSH: 'DATALAYER_PUSH',
}

export const showMeBuildInAnalyticsPlatform = () => {
  const platformList = []

  for (const item in analyticsPlatform) {
    platformList.push({ [item]: `"${analyticsPlatform[item]}"` })
  }

  console.group()
  console.info('BuildInAnalyticsPlatform')
  console.table(platformList)
  console.groupEnd()
}

export const analyticsEventActionPrefixList = {
  JOURNEY: 'J',
  INTERACTION: 'I',
}

export const showMeBuildInEventActionPrefixList = () => {
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

export const analyticsGlobalEventActionList = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATED: 'AUTHENTICATED',
  MENU_ACTIVE: 'MENU_ACTIVE',
  MENU_INACTIVE: 'MENU_INACTIVE',
}

export const showMeBuildInGlobalEventActionList = () => {
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

export let config = {}

/**
 * @type {Object} options: all attributes of the options object must have a value, other than withDeviceInfo.
 * @property {string} appName: the name of your app this value must be passed in.
 * @property {string} appSessionCookieName This is used to get the cookie from storage based on a key you use, the value from the cookie will be used in "client_id:"
 * @property {Object} eventActionPrefix: is a { key: 'value' } object that allows you to extend "analyticsEventActionPrefixList" object with custom eventActionPrefix. To see the build in list call the function showMeBuildInEventActionPrefixList().
 * @property {Array} globalEventActionList: is a { key: 'value' } object that allows you to extend "analyticsGlobalEventActionList" object with custom eventActionNames. To see the build in list call the function showMeBuildInGlobalEventActionList().
 * @property {Array} includeUserKeys: is an array of strings that represent keys from your user data that you want to whitelist, user data you wan to hash.
 * @property {Object} TOKENS: is a { key: 'value' } object that includes the following keys, IP_INFO_TOKEN, GA4_PUBLIC_API_SECRET, GA4_PUBLIC_MEASUREMENT_ID, depending on if you need these features enabled.
 * @property {Boolean} withDeviceInfo: if you want device information added to "globalVars" set this to true false by default.
 * @property {Boolean} withServerLocationInfo: if you want server information added to "journeyProps" set this to true false by default.
 */

const buildConfig = options => {
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

  assertIsTrue(appName, 'An appName must be provided in the config.')

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
