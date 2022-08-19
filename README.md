
# React Marketing Tools &nbsp; [![npm version](https://badge.fury.io/js/.svg)](https://badge.fury.io/js/)

[React Marketing Tools Demo](https://)

React Marketing Tools are a set of tools to make it easier to implement and manage analytics in your App like dataLayer/Google Tag Manager, GA4 & facebook pixel.

# PR's
- Have a look at the [PR template doc](https://github.com/bronz3beard/react-marketing-tools/blob/main/docs) for best approach to getting your pr merged.

# Usage with Provider
```js
    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import { ReactMarketingProvider, buildConfig } from 'react-marketing-tools';
    import App from './App'

    /*
        const TOKENS = { // all TOKENS are optional
            IP_INFO_TOKEN: 'SOME_TOKEN', // if withDeviceInfo is true you must supply this token.
            // if analyticsType = analyticsPlatform.GOOGLE the below tokens must be supplied.
            GA4_PUBLIC_API_SECRET: 'SOME_TOKEN',
            PUBLIC_MEASUREMENT_ID: 'SOME_TOKEN',
        }
    */

    // These are the keys for the values you want to include in your user data
    // these must be included for any user data to be collected by analytics
    const includeUserKeys = [
        'firstName',
        'lastName',
    ]

    const analyticsConfig = { 
        appName: 'my-awesome-app',
        eventActionPrefix: {
            ACTION: 'ACTION',
            OTHER_EVENT_NAME_TYPE: 'OTHER_EVENT_NAME_TYPE'
        }, // this will extend the default values of eventActionPrefix 
        globalEventActionList: {
            SIGN_IN: 'SIGN_IN',
            SIGN_UP: 'SIGN_UP',
            IMPORTANT_BUTTON_CLICKED: 'IMPORTANT_BUTTON_CLICKED'
        }, // this will extend the default values of globalEventActionList 
        // TOKENS, 
        includeUserKeys, 
        withDeviceInfo: true, // has default value
        withServerLocationInfo: false, // has default value
    }

    buildConfig(analyticsConfig)

    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <ReactMarketingProvider>
            <App />
            </ReactMarketingProvider>
        </React.StrictMode>
    )

```

```js
    import { useState, useEffect, useCallback } from 'react'
    import { ContextApi, ContextState, useMarketingApi, useMarketingState } from 'react-marketing-tools'

    function App() {
        const [count, setCount] = useState(0)
        const {
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

        return (
            <div>
                <div>
                    <button onClick={handleButtonClick}>
                        count is {count}
                    </button>
                </div>
            </div>
        )
    }

    export default App

```

Usage without Provider

```js
    import { trackAnalyticsEvent, analyticsPlatform } from "react-marketing-tools";

    const WelcomePage = () => {
        useEffect(function appLoadPageLandingWelcome() {
            trackAnalyticsEvent({
                data,
                eventNameInfo,
                analyticsType: analyticsPlatform.DATALAYER_PUSH,
                dataLayerCheck: true,
            })
        }, [])


        const onClick = () => {
            trackAnalyticsEvent({
                data,
                eventNameInfo,
                analyticsType: analyticsPlatform.DATALAYER_PUSH,
                userDataToHashKeyArray: ['firstName', 'lastName', 'email'],
            })

        }
        ...

        return (
            ...
        )
    }
```
