import { Platform, TrackAnalyticsEventOptions } from '..'

export type ProviderStateProps = {
  appName: string
  appSessionCookieName: string
  analyticsPlatform: Platform
  eventActionPrefixList: Record<string, string>
  analyticsGlobalEventActionList: Record<string, string>
}

export type ProviderApiProps = {
  trackAnalyticsEvent: (options: TrackAnalyticsEventOptions) => Promise<void>
  showMeBuildInAnalyticsPlatform: () => void
  showMeBuildInEventActionPrefixList: () => void
  showMeBuildInGlobalEventActionList: () => void
}
