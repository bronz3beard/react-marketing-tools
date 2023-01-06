import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ProviderApiProps,
  ProviderStateProps,
  useMarketingApi,
  useMarketingState,
} from './lib'
import { EventNameInfo, TrackAnalyticsEventOptions } from './lib/types'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const {
    analyticsPlatform,
    eventActionPrefixList,
    analyticsGlobalEventActionList,
  }: ProviderStateProps = useMarketingState()
  const { trackAnalyticsEvent }: ProviderApiProps = useMarketingApi()

  useEffectOnce(function appLoadPageLandingWelcome() {
    const sendAnalyticsEvent = async () => {
      const eventNameInfo: EventNameInfo = {
        eventName: 'Welcome Landing',
        actionPrefix: eventActionPrefixList.JOURNEY,
        globalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED,
      }

      const trackingData: TrackAnalyticsEventOptions = {
        data: {},
        eventNameInfo,
        analyticsType: analyticsPlatform.DATALAYER_PUSH,
        dataLayerCheck: true,
        userDataToHashKeyArray: null,
      }

      await trackAnalyticsEvent(trackingData)
    }

    sendAnalyticsEvent()
  })

  const handleButtonClick = useCallback(async () => {
    const countActual = count + 1
    setCount(countActual)

    const eventNameInfo: EventNameInfo = {
      eventName: 'count button click',
      actionPrefix: eventActionPrefixList.INTERACTION,
      globalAppEvent: analyticsGlobalEventActionList.AUTHENTICATED,
      previousGlobalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED,
    }

    const trackingData: TrackAnalyticsEventOptions = {
      data: {
        count: countActual,
        // firstName: 'bob',
        lastName: 'yeah nah',
        email: 'yeahnah@gmail.com',
      },
      eventNameInfo,
      analyticsType: analyticsPlatform.DATALAYER_PUSH,
      consoleLogData: {
        showJourneyPropsPayload: true,
      },
      dataLayerCheck: false,
      userDataToHashKeyArray: null,
    }

    await trackAnalyticsEvent(trackingData)
  }, [count])

  return (
    <div className="App">
      {/* <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
      </div> */}
      <h1>React Marketing Tools</h1>
      <div className="card">
        <button onClick={handleButtonClick}>count is {count}</button>
        <p>
          Add some useful info about the capability of React Marketing Tools
        </p>
      </div>
    </div>
  )
}

export default App

const useEffectOnce = (effect: () => void) => {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true
      return effect()
    }
  }, [effect])
}
