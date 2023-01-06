export type Platform = Record<string, string>

export type Tokens = {
  IP_INFO_TOKEN?: string
  GA4_PUBLIC_API_SECRET?: string
  GA4_PUBLIC_MEASUREMENT_ID?: string
}

export type Config = {
  TOKENS?: Tokens
  appName: string
  appSessionCookieName: string
  withDeviceInfo?: boolean
  includeUserKeys: Array<string>
  showMissingUserAttributesInConsole: boolean | undefined
  withServerLocationInfo: boolean | undefined
  eventActionPrefixList: Record<string, string>
  analyticsGlobalEventActionList: Record<string, string>
}

export type BuildConfigOptions = {
  appName: string
  appSessionCookieName: string
  eventActionPrefix: Record<string, string>
  globalEventActionList: Record<string, string>
  includeUserKeys: Array<string>
  showMissingUserAttributesInConsole: boolean | undefined
  TOKENS?: Tokens
  withDeviceInfo: boolean | undefined
  withServerLocationInfo: boolean | undefined
}
