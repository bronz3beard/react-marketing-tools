import { config } from '../buildConfig'
import { assertIsTrue } from '../utilities/assertValueCheckers'

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

export const buildServerLocationData = async (
  withServerLocationInfo: boolean | undefined,
): Promise<ServerLocationData | undefined> => {
  const { TOKENS } = { ...config }

  assertIsTrue(
    withServerLocationInfo ? !!TOKENS?.IP_INFO_TOKEN : true,
    'if you want serverLocationInfo your config must have the TOKEN.IP_INFO_TOKEN AND withServerLocationInfo must be true.',
  )

  if (withServerLocationInfo && TOKENS?.IP_INFO_TOKEN) {
    const ipInfo = await getIpInfo(TOKENS?.IP_INFO_TOKEN).then(
      response => response,
    )

    const serverLocationData = {
      SERVER_CITY: ipInfo.city,
      SERVER_COUNTRY: ipInfo.country,
      SERVER_HOSTNAME: ipInfo.hostname,
      SERVER_IP: ipInfo.ip,
      SERVER_LOCATION: ipInfo.loc,
      SERVER_POSTAL: ipInfo.postal,
      SERVER_REGION: ipInfo.region,
      SERVER_TIMEZONE: ipInfo.timezone,
    }

    return serverLocationData
  }

  return undefined
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

export const getIpInfo = (IP_INFO_TOKEN: string): Promise<IpInfo> =>
  fetch(`https://ipinfo.io/110.174.218.10?token=${IP_INFO_TOKEN}`).then(
    response => response.json(),
  )
