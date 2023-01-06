export type GlobalVars = {
  app: string
  device_category?: string | undefined
  device_os?: string | undefined
  device_browser?: string | undefined
}

export type DataLayer = {
  event: string
  globalVars: GlobalVars
  journeyProps: Record<any, any>
  userProps: Record<any, any>
}

export type ConsoleLogData = {
  showGlobalVars?: boolean
  showJourneyPropsPayload?: boolean
  showUserProps?: boolean
}

interface AnalyticsTrackerDataOptions {
  consoleLogData: ConsoleLogData | null
  data: Record<any, any>
  eventName: string
  globalAppEvent: string
  userDetails: Record<any, any>
}

export interface HandleDataLayerPushOptions
  extends AnalyticsTrackerDataOptions {
  dataLayerCheck: boolean
}
export type Ga4GoogleAnalyticsEventTracking = AnalyticsTrackerDataOptions
