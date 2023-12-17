import {
  buildAnalyticsEventName,
  buildNewUserData,
  hashUserData,
} from './helpers'
import ga4GoogleAnalyticsEventTracking from './ga4GoogleAnalyticsEventTracking'
import handleDataLayerPush from './handleDataLayerPush'
import { config, analyticsPlatform } from '../buildConfig'
import {
  objectHasAttributes,
  replaceWhiteSpace,
} from '../utilities/commonFunctions'
import { assertIsTrue } from '../utilities/assertValueCheckers'
import { TrackAnalyticsEventOptions } from '../types'

/* NOTE::
  https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#limitations
*/

/**
 *
 * @paramType {object} options
 * @property {object} data this is an object of any data you want to collect in analytics
 * @property {object} eventNameInfo
 * @property {string} analyticsType
 * @property {array | undefined} userDataToHashKeyArray default for this value is null, when used it should include an array of strings you wish to hash.
 * @property {boolean} dataLayerCheck
 * @property {object} consoleLogData (optional) is an object with the following attributes, "showGlobalVars", "showJourneyPropsPayload", "showUserProps" if any of the values are true you will be able to see the respective payload in your console.
 */

const trackAnalyticsEvent = async (
  options: TrackAnalyticsEventOptions,
): Promise<void> => {
  const {
    data,
    eventNameInfo,
    analyticsType,
    userDataToHashKeyArray = null,
    dataLayerCheck = false,
    consoleLogData = null,
  } = options
  const { includeUserKeys, showMissingUserAttributesInConsole } = config

  assertIsTrue(
    objectHasAttributes(analyticsPlatform, analyticsType),
    `"analyticsType" of ${analyticsType} cannot be found in the analyticsPlatform object to view available platforms use showMeBuildInAnalyticsPlatform()`,
  )
  assertIsTrue(
    objectHasAttributes(eventNameInfo, 'actionPrefix') &&
      objectHasAttributes(eventNameInfo, 'globalAppEvent'),
    'actionPrefix AND globalAppEvent must be included in the eventNameInfo object passed to trackAnalyticsEvent function',
  )

  const eventName = !eventNameInfo?.eventName
    ? buildAnalyticsEventName(eventNameInfo)
    : `${eventNameInfo.actionPrefix}_${replaceWhiteSpace(
        eventNameInfo.eventName,
        '_',
      ).toUpperCase()}`

  if (analyticsType === analyticsPlatform.DATALAYER_PUSH) {
    // add payload to dataLayer for Google tag manager
    await handleDataLayerPush({
      eventName,
      dataLayerCheck,
      globalAppEvent: eventNameInfo.globalAppEvent,
      data: {
        ...data,
      },
      userDetails: buildNewUserData(
        data,
        config.includeUserKeys,
        showMissingUserAttributesInConsole,
      ),
      consoleLogData,
    })
  }

  if (analyticsType === analyticsPlatform.GOOGLE) {
    let userDetails = {}

    assertIsTrue(
      userDataToHashKeyArray !== null && userDataToHashKeyArray?.length > 0,
      'User data must be hashed before sending to GA4, any user data that is considered "Identifiable"',
    )

    if (
      objectHasAttributes(
        buildNewUserData(
          data,
          includeUserKeys,
          showMissingUserAttributesInConsole,
        ),
      )
    ) {
      const hashList: Array<string> =
        userDataToHashKeyArray as unknown as Array<string>
      userDetails = await hashUserData(
        buildNewUserData(
          data,
          includeUserKeys,
          showMissingUserAttributesInConsole,
        ),
        hashList,
      )
    }

    // send payload to google analytics
    await ga4GoogleAnalyticsEventTracking({
      data,
      eventName,
      userDetails,
      globalAppEvent: eventNameInfo.globalAppEvent,
      consoleLogData,
    })
  }

  // if (analyticsType === analyticsPlatform.FACEBOOK) {
  //   // send payload to facebook
  //   facebookPixelEventTracking({
  //     data,
  //     eventName,
  //     userDetails,
  //     globalAppEvent: eventNameInfo.globalAppEvent,
  //  });
  // }
}

export { trackAnalyticsEvent }
