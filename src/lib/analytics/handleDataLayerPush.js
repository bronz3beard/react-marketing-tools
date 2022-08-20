import { config } from '../buildConfig'
import { getCookieValueByName } from '../utilities/cookies'
import {
  buildEventDataObject,
  defaultDataLayerEventCheck,
  deviceDetectorInfo,
} from './helpers'

/**
 *
 * @param {object} options
 */
const handleDataLayerPush = async options => {
  const {
    consoleLogData,
    data,
    eventName,
    globalAppEvent,
    dataLayerCheck,
    userDetails,
  } = options
  const { appName, appSessionCookieName, withDeviceInfo } = config

  // navigator - https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator
  const agent = navigator.userAgent
  const device = withDeviceInfo ? deviceDetectorInfo(agent) : withDeviceInfo // get user agent info

  // build data payload append extra values if available
  const dataLayerValues = await buildEventDataObject(data, globalAppEvent)

  const dataLayerData = {
    event: eventName, // equal to event name for google analytics
    globalVars: {
      app: appName,
      ...(!device
        ? []
        : {
            device_category: device.device?.type, // "desktop"
            device_os: `${device.os?.name}_${device.os?.version}`, // "Mac"
            device_browser: device.client?.name, // "Firefox"
          }),
    },
    userProps: {
      ...userDetails,
      client_id: getCookieValueByName(appSessionCookieName),
    },
    journeyProps: {
      ...dataLayerValues,
    },
  }

  _showPayloadInConsole({ dataLayerData, ...consoleLogData })

  if (dataLayerCheck) {
    const dataLayerValueCheck = defaultDataLayerEventCheck(eventName)

    if (!dataLayerValueCheck) {
      window.dataLayer.push(dataLayerData)
    }
  } else {
    window.dataLayer.push(dataLayerData)
  }
}

export default handleDataLayerPush

/**
 *
 * @param {object} options
 */
const _showPayloadInConsole = options => {
  const {
    dataLayerData,
    showGlobalVars,
    showJourneyPropsPayload,
    showUserProps,
  } = options

  if (showGlobalVars) {
    console.log('dataLayerData.globalVars', dataLayerData.globalVars)
  }

  if (showUserProps) {
    console.log('dataLayerData.userProps', dataLayerData.userProps)
  }

  if (showJourneyPropsPayload) {
    console.log('dataLayerData.journeyProps', dataLayerData.journeyProps)
  }
}
