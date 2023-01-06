export type Event = {
  name: string
  params: Record<AllowedTypes, AllowedTypes>
}

export type GooglePayload = {
  non_personalized_ads: boolean
  client_id: string
  user_id: string
  user_properties: {
    user_id: string
    user_type: string
    client_id: string
  }
  events: Event[]
}

export type EventNameInfo = {
  eventName: string
  description?: string
  actionPrefix: string
  globalAppEvent: string
  previousGlobalAppEvent?: string
}

export type AllowedTypes = string | number

export type TrackAnalyticsEventOptions = {
  data: Record<AllowedTypes, AllowedTypes>
  eventNameInfo: EventNameInfo
  analyticsType: string
  userDataToHashKeyArray: Array<string> | null
  dataLayerCheck: boolean
  consoleLogData?: object
}

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
