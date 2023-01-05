import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ContextApi,
  ContextState,
  useMarketingApi,
  useMarketingState,
} from './lib'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const {
    analyticsPlatform,
    eventActionPrefixList,
    analyticsGlobalEventActionList,
  } = useMarketingState(ContextState)
  const { trackAnalyticsEvent } = useMarketingApi(ContextApi)

  useEffectOnce(function appLoadPageLandingWelcome() {
    const sendAnalyticsEvent = async () => {
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
    }

    sendAnalyticsEvent()
  })

  const handleButtonClick = useCallback(async () => {
    const countActual = count + 1
    setCount(countActual)

    const eventNameInfo = {
      eventName: 'count button click',
      actionPrefix: eventActionPrefixList.INTERACTION,
      globalAppEvent: analyticsGlobalEventActionList.AUTHENTICATED,
      previousGlobalAppEvent: analyticsGlobalEventActionList.UNAUTHENTICATED,
    }

    await trackAnalyticsEvent({
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
    })
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

const useEffectOnce = effect => {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true
      return effect()
    }
  }, [effect])
}
