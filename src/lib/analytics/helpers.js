import {
  hashString,
  objectHasAttributes,
  replaceWhiteSpace,
} from '../utilities/commonFunctions'
import { buildServerLocationData } from '../ipInfo'
import DeviceDetector from 'device-detector-js'
import { config } from '../buildConfig'
import { assertIsTrue } from '../utilities/assertValueCheckers'

/**
 *
 * @param {object} user the structure of this data is dictated by you, aka your API or DB.
 * @param {[string]} includeUserKeys is an array of strings that represent keys from your user data that you want to whitelist, the value for each key in the whitelist will be hashed.
 * @returns a new user object with all values hashed including only the whitelisted key value pairs
 */
export const hashUserData = async (user, includeUserKeys) => {
  // this is a whitelist of keys to hash
  const userKeyIncludeList = [...includeUserKeys]
  const userObject = {}

  assertIsTrue(
    objectHasAttributes(user),
    `helpers.js ~ line 25 ~ hashUserData ~ Please check your user data, it looks like it is empty! ${user}`,
  )

  for (let key in user) {
    if (userKeyIncludeList.includes(key)) {
      const dataValue = await hashString(user[key])
      userObject[key] = dataValue
    }
  }

  return userObject
}

/**
 *
 * @param {object} user the structure of this data is dictated by you, aka your API or DB.
 * @param {[string]} includeUserKeys is an array of strings that represent keys from your user data that you want to map over, if no keys are supplied the original passed in user data is returned.
 * @returns If no "includeUserKeys" are supplied the original ser object is returned, otherwise, a new user object with only the key value pairs that you included in your includeUserKeys array is returned.
 */
export const buildNewUserData = (user, includeUserKeys) => {
  const userObject = {}

  if (objectHasAttributes(user)) {
    if (includeUserKeys.length > 0) {
      includeUserKeys.forEach(item => {
        if (user[item]) {
          userObject[item] = `${user[item]}`
        } else {
          console.error(
            `analyticsEventService -> buildNewUserData: line 94 - The key:${item} does not exist on the data object`,
          )
        }
      })
    }
  }

  return userObject
}

// buildAnalyticsEventName constructs our event name for each event in a Journey, Interaction
// 1. JOURNEY | INTERACTION
// 2. DESCRIPTION
// 3. CURRENT_SEQUENCE (if a JOURNEY otherwise can be undefined)
// 4. PREVIOUS_SEQUENCE (if a JOURNEY otherwise can be undefined)
// e.g. J_CURRENTBOARD_OTHER_INFO_REQUIRED_INFO
// NOTE:: local eventNames must match global naming if event name is to be build rather than passed in
// const eventNameInfo = {
//   actionPrefix: analyticsPrefixActionList.JOURNEY,
//   description: 'Welcome Landing', // OPTIONAL
//   globalAppEvent: analyticsGlobalEventActionList.AUTHENTICATED,
//   previousGlobalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED, // OPTIONAL
// }

/**
 *
 * @paramType {Object} eventNameInfo
 * @property {analyticsPrefixActionList} actionPrefix either a built in value of JOURNEY | INTERACTION or a custom value added to the analyticsPrefixActionList object.
 * @property {string} description an OPTIONAL value passed in that is formatted like the following from 'Very descriptive description' to VERY_DESCRIPTIVE_DESCRIPTION.
 * @property {string} globalAppEvent the current event name for this track event selected from the analyticsGlobalEventActionList
 * @property {string} previousGlobalAppEvent an OPTIONAL value, the previous event name for this track event selected from the analyticsGlobalEventActionList.
 * @returns string eventName for this specific tracked event
 */
export const buildAnalyticsEventName = eventNameInfo => {
  if (
    !objectHasAttributes(eventNameInfo, 'actionPrefix') &&
    !objectHasAttributes(eventNameInfo, 'globalAppEvent')
  ) {
    throw new Error(
      'actionPrefix AND globalAppEvent must be included in the eventNameInfo object passed to buildAnalyticsEventName function',
    )
  }

  const { currentSequence, previousSequence } = _checkEventSequence(
    eventNameInfo.globalAppEvent,
    eventNameInfo.previousGlobalAppEvent,
  )

  const eventName = `${eventNameInfo.actionPrefix}${
    !eventNameInfo.description
      ? ''
      : `_${replaceWhiteSpace(eventNameInfo.description, '_').toUpperCase()}`
  }_${currentSequence}${!previousSequence ? '' : `_${previousSequence}`}`

  return eventName
}
/**
 *
 * @param {object} data
 * @param {string} globalAppEvent
 * @returns dataObject
 */
export const buildEventDataObject = async (data, globalAppEvent) => {
  const timeElapsed = Date.now()
  const today = new Date(timeElapsed)
  const { withServerLocationInfo } = config

  const serverLocationData = await buildServerLocationData(
    withServerLocationInfo,
  )

  // this is data that is always sent in the payload
  let actionDataObject = {
    // TODO:: add default variable from user into this object maybe?
    HIT_TIMESTAMP: today.toISOString(),
    ...(!serverLocationData ? [] : serverLocationData),
  }

  return await _appendValuesToJourneyData(
    actionDataObject,
    data,
    globalAppEvent,
  )
}

/**
 *
 * @param {string} eventName
 * @returns a Boolean value, true if the event name is already in the dataLayer.
 */
export const defaultDataLayerEventCheck = eventName => {
  const dataLayerItem = window.dataLayer.find(item => item.event === eventName)

  return !!dataLayerItem
}

/**
 *
 * @param {string} userAgent
 * @returns deviceInfo
 */
export const deviceDetectorInfo = userAgent => {
  // for more info on this package see here: https://www.npmjs.com/package/device-detector-js
  const deviceDetector = new DeviceDetector()
  const deviceInfo = deviceDetector.parse(userAgent)

  return deviceInfo
}

/* private(ish) functions */

/**
 * check the currentSequence and/or previousSequence for the event exist in the analyticsGlobalEventActionList
 * @param {string} globalAppEvent
 * @param {string} previousGlobalAppEvent
 */
const _checkEventSequence = (globalAppEvent, previousGlobalAppEvent = '') => {
  const { analyticsGlobalEventActionList } = config
  let previousSequence = ''

  assertIsTrue(
    Object.values(analyticsGlobalEventActionList).includes(globalAppEvent),
    'getEventSequence(), globalAppEvent is not in the analyticsGlobalEventActionList!',
  )
  const currentSequence = analyticsGlobalEventActionList[globalAppEvent]

  if (!previousGlobalAppEvent) {
    previousSequence = undefined
  } else if (
    Object.values(analyticsGlobalEventActionList).includes(
      previousGlobalAppEvent,
    )
  ) {
    previousSequence = analyticsGlobalEventActionList[previousGlobalAppEvent]
  } else {
    console.warn(
      'getEventSequence(), previousGlobalAppEvent is not in the analyticsGlobalEventActionList!',
    )
    throw new Error(
      'getEventSequence(), previousGlobalAppEvent is not in the analyticsGlobalEventActionList!',
    )
  }

  return { currentSequence, previousSequence }
}

/**
 * _addNewDetailsToJourneyData combines default object and new values to one dataObject to send to the respective analytics platform.
 * @param {object} dataObject
 * @param {object} newData
 */
const _addNewDetailsToJourneyData = (dataObject, newData) =>
  Object.assign(dataObject, newData)

/**
 * NOTE:: (Not finished) appendValuesToDefaultDataActionObject adds extra values to the default data object specific to the Journey, Interaction, Bubble.
 * @param {object} actionDataObject
 * @param {object} data
 * @param {string} globalAppEvent
 * @returns newActionDataObject
 */
const _appendValuesToJourneyData = (
  // TODO:: this needs to be configurable and have new action data passed to it not created here
  actionDataObject,
  data,
  globalAppEvent,
) => {
  const { analyticsGlobalEventActionList, includeUserKeys } = config
  let newActionData = {}

  // check currentSequence relevant to the event or used passed in value
  const { currentSequence } = _checkEventSequence(globalAppEvent)

  for (const item in analyticsGlobalEventActionList) {
    // TODO:: figure out how to assign the same values to a different event
    //  || (item !== currentSequence && assignSameValuesAs)
    if (item === currentSequence) {
      // NOTE:: this data/newActionData could be a lot here,
      // but will only get mapped to analytics if tag manager or analytics platform is made away of a key value
      // maybe think about letting user pass in whitelist array per dataset/action
      Object.entries(data).map(([index, value]) => {
        if (!includeUserKeys.includes(index)) {
          newActionData = {
            ...newActionData,
            [index.toUpperCase()]: value,
          }
        }
      })
    }
  }

  return _addNewDetailsToJourneyData(actionDataObject, newActionData)
}

// /**
//  *
//  * @param {object} flowTemplate this is the string value from the currently completed event journey
//  * @param {array} journeyCompleteList this is an array of event journey completion string value names
//  * @returns
//  */
// export const getJourneySequenceConfirmationFE = (flowTemplate, journeyCompleteList = []) => {
//   let endActionSequence = '' // TODO:: figure out why this is useful

//   journeyCompleteList.forEach(eventName => {
//     if (flowTemplate === eventName) {
//       endActionSequence = journeyCompleteList[eventName]
//     }
//   })

//   return endActionSequence
// }
