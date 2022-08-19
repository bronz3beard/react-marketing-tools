
# React Marketing Tools &nbsp; [![npm version](https://badge.fury.io/js/react-marketing-tools.svg)](https://badge.fury.io/js/react-marketing-tools)

React Marketing Tools are a set of tools to make it easier for you to implement analytics and track user journeys, interactions throughout your App. using dataLayer/Google Tag Manager, GA4 fetch directly or coming soon facebook pixel.

COMING SOON: [React Marketing Tools Demo](https://)
- For now you can clone and run locally. There is a very basic demo app, thanks to [Vite.](https://vitejs.dev/)


# PR's
- Have a look at the [PR template doc](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs) for best approach to getting your pr merged.

# CHANGELOG
- You can view it [here](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs/CHANGELOG.md)

# Usage and setup examples.

### Setup configuration
- Setting up config without provider is also an option, in this case you will only need to import _buildConfig_
```js
    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import { ReactMarketingProvider, buildConfig } from 'react-marketing-tools';
    import App from './App'

    /*
        TOKENS are optional
        const TOKENS = {

            // if withDeviceInfo is true you must supply this token.
            IP_INFO_TOKEN: 'SOME_TOKEN',

            // if analyticsType = analyticsPlatform.GOOGLE the below tokens must be supplied.
            GA4_PUBLIC_API_SECRET: 'SOME_TOKEN',
            PUBLIC_MEASUREMENT_ID: 'SOME_TOKEN',
        }
    */

    // These are the keys for the values you want to include from your user data
    // these must be included for any user data to be collected by analytics event if user data is hardcoded when passed in.
    const includeUserKeys = [
        'firstName',
        'lastName',
    ]

    const analyticsConfig = { 
        appName: 'my-awesome-app', // required
        appSessionCookieName: 'APP_SESSION',
        eventActionPrefix: { // this will extend the default values of eventActionPrefix 
            ACTION: 'ACTION',
            OTHER_EVENT_NAME_TYPE: 'OTHER_EVENT_NAME_TYPE'
        },
        globalEventActionList: { // this will extend the default values of globalEventActionList 
            SIGN_IN: 'SIGN_IN',
            SIGN_UP: 'SIGN_UP',
            IMPORTANT_BUTTON_CLICKED: 'IMPORTANT_BUTTON_CLICKED'
        },
        // TOKENS // (optional), 
        includeUserKeys, 
        withDeviceInfo: true, // (optional) has default value
        withServerLocationInfo: false, // (optional) has default value
    }

    /**
        * @type {Object} buildConfig -> options: all attributes of the options object must have a value, other than withDeviceInfo.
        * @property {string} appName: the name of your app this value must be passed in.
        * @property {string} appSessionCookieName This is used to get the cookie from storage based on a key you use, the value from the cookie will be used in "client_id:"
        * @property {Object} eventActionPrefix: is a { key: 'value' } object that allows you to extend "analyticsEventActionPrefixList" object with custom eventActionPrefix. To see the build in list call the function showMeBuildInEventActionPrefixList().
        * @property {Array} globalEventActionList: is a { key: 'value' } object that allows you to extend "analyticsGlobalEventActionList" object with custom eventActionNames. To see the build in list call the function showMeBuildInGlobalEventActionList().
        * @property {Array} includeUserKeys: is an array of strings that represent keys from your user data that you want to whitelist, user data you wan to hash.
        * @property {Object} TOKENS: is a { key: 'value' } object that includes the following keys, IP_INFO_TOKEN, GA4_PUBLIC_API_SECRET, GA4_PUBLIC_MEASUREMENT_ID, depending on if you need these features enabled.
        * @property {Boolean} withDeviceInfo: if you want device information added to "globalVars" set this to true false by default.
        * @property {Boolean} withServerLocationInfo: if you want server information added to "journeyProps" set this to true false by default.
    */
    buildConfig(analyticsConfig)

    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <ReactMarketingProvider>
                <App />
            </ReactMarketingProvider>
        </React.StrictMode>
    )

```

## Usage with Provider
```js
    import { useState, useEffect } from 'react'
    import { ContextApi, ContextState, useMarketingApi, useMarketingState } from 'react-marketing-tools'

    function App() {
        const [count, setCount] = useState(0)
        const {
            appSessionCookieName,
            analyticsPlatform,
            eventActionPrefixList,
            analyticsGlobalEventActionList
        } = useMarketingState(ContextState)
        const {
            trackAnalyticsEvent,
            /*
                NOTE: If you want to see built in config items and your added items, use one of the following functions to the body of your functional component or useEffect/function
                call it like so showMeBuildInAnalyticsPlatform() then check your console, in dev tools.
                showMeBuildInAnalyticsPlatform,
                showMeBuildInEventActionPrefixList,
                showMeBuildInGlobalEventActionList,
            */
        } = useMarketingApi(ContextApi)

        useEffect(function appLoadPageLandingWelcome() {
            // create session cookie, useful for unauthenticated user tracking and other things
            document.cookie = `${appSessionCookieName}=${uuid()};max-age=${70};SameSite=Strict;Secure`

            const eventNameInfo = {
                actionPrefix: eventActionPrefixList.JOURNEY,
                description: 'Welcome Landing',
                globalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED,
            }

            trackAnalyticsEvent({
                data: {},
                eventNameInfo,
                analyticsType: analyticsPlatform.DATALAYER_PUSH,
                dataLayerCheck: true,
            })
        })

        const handleButtonClick = () => {
            setCount((count) => count + 1)

            const eventNameInfo = {
                eventName: 'count button click',
                actionPrefix: eventActionPrefixList.INTERACTION,
                globalAppEvent: analyticsGlobalEventActionList.AUTHENTICATED,
                previousGlobalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED
            }

            trackAnalyticsEvent({
                data: {
                    count,
                    firstName: 'bob',
                    lastName: 'yeah nah',
                    email: 'yeahnah@gmail.com',
                },
                eventNameInfo,
                analyticsType: analyticsPlatform.DATALAYER_PUSH,
                consoleLogData: {
                    showJourneyPropsPayload: true
                }
            })
        }
        ...

        return (
            ...
        )
    }

```

## Usage without Provider
```js
    import { useState, useEffect, useCallback } from 'react'
    import { trackAnalyticsEvent, analyticsPlatform } from "react-marketing-tools";

    const WelcomePage = () => {
        useEffect(function appLoadPageLandingWelcome() {
            const eventNameInfo = {
                actionPrefix: eventActionPrefixList.JOURNEY,
                description: 'Welcome Landing',
                globalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED,
            }

            trackAnalyticsEvent({
                data: {},
                eventNameInfo,
                analyticsType: analyticsPlatform.DATALAYER_PUSH,
                dataLayerCheck: true,
            })
        })

        const handleButtonClick = () => {
            setCount((count) => count + 1)

            const eventNameInfo = {
                eventName: 'count button click',
                actionPrefix: eventActionPrefixList.INTERACTION,
                globalAppEvent: analyticsGlobalEventActionList.AUTHENTICATED,
                previousGlobalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED
            }

            trackAnalyticsEvent({
                data: {
                    count,
                    firstName: 'bob',
                    lastName: 'yeah nah',
                    email: 'yeahnah@gmail.com',
                },
                eventNameInfo,
                analyticsType: analyticsPlatform.DATALAYER_PUSH,
                consoleLogData: {
                    showJourneyPropsPayload: true
                }
            })
        }
        ...

        return (
            ...
        )
    }
```
