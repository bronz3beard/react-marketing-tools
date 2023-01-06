import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReactMarketingProvider, buildConfig } from './lib'
import { BuildConfigOptions } from '.'
import App from './App'
import './index.css'

/* Example of how tokens could be added to config.
  const TOKENS: Tokens = { // all TOKENS are optional
    IP_INFO_TOKEN: 'SOME_TOKEN', // if withDeviceInfo is true you must supply this token.
    // if analyticsType = analyticsPlatform.GOOGLE the below tokens must be supplied.
    GA4_PUBLIC_API_SECRET: 'SOME_TOKEN',
    GA4_PUBLIC_MEASUREMENT_ID: 'SOME_TOKEN',
  }
*/

/*
  These are the keys for the values you want to include in your user data
  these must be included for any user data to be collected by analytics.
*/
const includeUserKeys = ['email', 'firstName', 'lastName']

const analyticsConfig: BuildConfigOptions = {
  appName: 'my-awesome-app',
  appSessionCookieName: 'APP_SESSION',
  eventActionPrefix: {
    ACTION: 'ACTION',
    OTHER_EVENT_NAME_TYPE: 'OTHER_EVENT_NAME_TYPE',
  }, // this will extend the default values of eventActionPrefix
  globalEventActionList: {
    SIGN_IN: 'SIGN_IN',
    SIGN_UP: 'SIGN_UP',
    IMPORTANT_BUTTON_CLICKED: 'IMPORTANT_BUTTON_CLICKED',
  }, // this will extend the default values of globalEventActionList
  includeUserKeys,
  showMissingUserAttributesInConsole: false, // showMissingUserAttributesInConsole,
  // TOKENS,
  withDeviceInfo: true,
  withServerLocationInfo: false,
}

buildConfig(analyticsConfig)

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <ReactMarketingProvider>
      <App />
    </ReactMarketingProvider>
  </React.StrictMode>,
)
