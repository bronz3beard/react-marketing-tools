import { config } from '..'
import { assertIsTrue } from '../utilities/assertValueCheckers'
import { objectHasAttributes } from '../utilities/commonFunctions'
import { getCookieValueByName } from '../utilities/cookies'
import { buildEventDataObject } from './helpers'
import { Ga4GoogleAnalyticsEventTracking, GooglePayload } from '../types'

const ga4GoogleAnalyticsEventTracking = async (
  options: Ga4GoogleAnalyticsEventTracking,
) => {
  const { consoleLogData, data, eventName, globalAppEvent, userDetails } =
    options
  const { appSessionCookieName, TOKENS } = { ...config }

  assertIsTrue(
    !!TOKENS,
    'TOKENS in config must contain GA4_PUBLIC_API_SECRET and GA4_PUBLIC_MEASUREMENT_ID key: value if you want to use ga4GoogleAnalyticsEventTracking',
  )
  assertIsTrue(
    objectHasAttributes(TOKENS!, 'GA4_PUBLIC_API_SECRET'),
    'GA4_PUBLIC_API_SECRET not supplied in config',
  )
  assertIsTrue(
    objectHasAttributes(TOKENS!, 'GA4_PUBLIC_MEASUREMENT_ID'),
    'GA4_PUBLIC_MEASUREMENT_ID not supplied in config',
  )

  const { GA4_PUBLIC_API_SECRET, GA4_PUBLIC_MEASUREMENT_ID } = { ...TOKENS }
  // build data append extra values if available
  const googleData = await buildEventDataObject(data, globalAppEvent)

  // primary values in payload are lowercase on purpose, params are uppercase by design.
  /*
    // We don't have access to the attributes outside of user_properties and events. these are exclusively used by ga4,
    // that is why some of the values are duplicated.
    // "session" cookie created at the start of session and removed at the end of the session
    // user should only be null on initial page load when unauthenticated
    // these are properties that don't change over time.
    // TODO add user details later.
    // user_postcode: userDetails.postcode, does not need to be hashed
    // email: userDetails.email, needs to be hashed
    // first_name: userDetails.first_name, needs to be hashed
    // last_name: userDetails.surname, needs to be hashed
    // mobile: userDetails.mobile, needs to be hashed
    // phone: userDetails.phone, needs to be hashed
  */

  const googleDataPayload: GooglePayload = {
    non_personalized_ads: false,
    client_id: getCookieValueByName(appSessionCookieName) ?? '',
    user_id: `${userDetails?.id ?? ''}`,
    user_properties: {
      user_id: `${userDetails?.id ?? ''}`,
      user_type: `${userDetails.userType}`,
      client_id: getCookieValueByName(appSessionCookieName) ?? '',
    },
    events: [
      {
        name: eventName,
        params: { ...googleData },
      },
    ],
  }

  fetch(
    `https://www.google-analytics.com/mp/collect?api_secret=${GA4_PUBLIC_API_SECRET}&measurement_id=${GA4_PUBLIC_MEASUREMENT_ID}`, // TODO:: this needs to be passed in by the user
    {
      method: 'POST',
      body: JSON.stringify(googleDataPayload),
    },
  )

  _showPayloadInConsole({ googleDataPayload, ...consoleLogData })
}

export default ga4GoogleAnalyticsEventTracking

type ShowPayloadInConsole = {
  googleDataPayload: GooglePayload
  showJourneyPropsPayload?: boolean
  showUserProps?: boolean
}

const _showPayloadInConsole = (options: ShowPayloadInConsole) => {
  const { googleDataPayload, showJourneyPropsPayload, showUserProps } = options

  if (showUserProps) {
    console.log(
      'googleDataPayload.user_properties',
      googleDataPayload.user_properties,
    )
  }

  if (showJourneyPropsPayload) {
    console.log('googleDataPayload.events', googleDataPayload.events)
  }
}
