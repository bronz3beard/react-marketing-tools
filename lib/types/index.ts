export interface AnalyticsEventActionPrefix extends Record<string, string> {
  JOURNEY: 'J'
  INTERACTION: 'I'
}
export interface AnalyticsGlobalEventAction extends Record<string, string> {
  UNAUTHENTICATED: 'UNAUTHENTICATED'
  AUTHENTICATED: 'AUTHENTICATED'
  MENU_ACTIVE: 'MENU_ACTIVE'
  MENU_INACTIVE: 'MENU_INACTIVE'
}

// Event types
export type Event = {
  name: string
  params: Record<AllowedTypes, AllowedTypes>
}

// GooglePayload type - Represents the payload structure for Google Analytics
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

// EventNameInfo type - Information about a specific analytics event
export type EventNameInfo = {
  eventName: string
  description?: string
  actionPrefix: string
  globalAppEvent: string
  previousGlobalAppEvent?: string
}

// AllowedTypes type - Union type for allowed parameter types in events
export type AllowedTypes = string | number

// TrackAnalyticsEventOptions type - Options for tracking an analytics event
export type TrackAnalyticsEventOptions = {
  data: Record<AllowedTypes, AllowedTypes>
  eventNameInfo: EventNameInfo
  analyticsType: string
  userDataToHashKeyArray: Array<string> | null
  dataLayerCheck: boolean
  consoleLogData?: object
}

// GlobalVars type - Represents global variables in analytics tracking
export type GlobalVars = {
  app: string
  device_category?: string | undefined
  device_os?: string | undefined
  device_browser?: string | undefined
}

// DataLayer type - Represents the data layer for analytics events
export type DataLayer = {
  event: string
  globalVars: GlobalVars
  journeyProps: Record<any, any>
  userProps: Record<any, any>
}

// ConsoleLogData type - Options for console logging analytics data
export type ConsoleLogData = {
  showGlobalVars?: boolean
  showJourneyPropsPayload?: boolean
  showUserProps?: boolean
}

// AnalyticsTrackerDataOptions interface - Options for analytics tracking
export interface AnalyticsTrackerDataOptions {
  consoleLogData: ConsoleLogData | null
  data: Record<any, any>
  eventName: string
  globalAppEvent: string
  userDetails: Record<any, any>
}

// HandleDataLayerPushOptions type - Options for handling data layer push
export interface HandleDataLayerPushOptions
  extends AnalyticsTrackerDataOptions {
  dataLayerCheck: boolean
}

export type ServerLocationData = {
  SERVER_CITY: string
  SERVER_COUNTRY: string
  SERVER_HOSTNAME: string
  SERVER_IP: string
  SERVER_LOCATION: string
  SERVER_POSTAL: string
  SERVER_REGION: string
  SERVER_TIMEZONE: string
}

export type IpInfo = {
  city: string
  country: string
  SERVER_HOSTNAME: string
  hostname: string
  ip: string
  loc: string
  postal: string
  region: string
  timezone: string
}

// Ga4GoogleAnalyticsEventTracking type - Options for GA4 Google Analytics event tracking
export type Ga4GoogleAnalyticsEventTracking = AnalyticsTrackerDataOptions

// Platform type - Union type for supported analytics platforms
export type Platform = 'GOOGLE' | 'FACEBOOK' | 'DATALAYER_PUSH'

export type AnalyticsPlatform = { [key in Platform]: Platform }

// Tokens type - Represents tokens used in the analytics configuration
export type Tokens = {
  IP_INFO_TOKEN?: string
  GA4_PUBLIC_API_SECRET?: string
  GA4_PUBLIC_MEASUREMENT_ID?: string
}

// Config type - Represents the configuration for analytics tracking
export type Config = {
  TOKENS?: Tokens
  appName: string
  appSessionCookieName: string
  withDeviceInfo?: boolean
  includeUserKeys: Array<string>
  showMissingUserAttributesInConsole: boolean | undefined
  withServerLocationInfo: boolean | undefined
  eventActionPrefixList: AnalyticsEventActionPrefix
  analyticsGlobalEventActionList: AnalyticsGlobalEventAction
}

// BuildConfigOptions type - Options for building the analytics configuration
export type BuildConfigOptions = {
  appName: string
  appSessionCookieName: string
  eventActionPrefix?: AnalyticsEventActionPrefix
  globalEventActionList?: AnalyticsGlobalEventAction
  includeUserKeys?: Array<string> | undefined
  showMissingUserAttributesInConsole?: boolean
  showMeBuildInEventActionPrefixList?: boolean
  TOKENS?: Tokens
  withDeviceInfo?: boolean
  withServerLocationInfo?: boolean
}

export let config: Config

// ProviderStateProps type - Represents props related to the state of the analytics provider
export type ProviderStateProps = {
  appName: string
  appSessionCookieName: string
  analyticsPlatform: AnalyticsPlatform
  eventActionPrefixList: AnalyticsEventActionPrefix
  analyticsGlobalEventActionList: AnalyticsGlobalEventAction
}

// ProviderApiProps type - Represents props for the analytics provider API
export type ProviderApiProps = {
  // Function to track an analytics event
  trackAnalyticsEvent: (options: TrackAnalyticsEventOptions) => Promise<void>
  // Function to log supported analytics platforms
  showMeBuildInAnalyticsPlatform: () => void
  // Function to log built-in event action prefix list
  showMeBuildInEventActionPrefixList: () => void
  // Function to log built-in global event action list
  showMeBuildInGlobalEventActionList: () => void
}
