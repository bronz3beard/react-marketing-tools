import { IpInfo, ServerLocationData } from '../types'

export const buildServerLocationData = async (
  withServerLocationInfo: boolean | undefined,
  IP_INFO_TOKEN: string | undefined,
): Promise<ServerLocationData | undefined> => {
  if (withServerLocationInfo && IP_INFO_TOKEN) {
    const ipInfo = await getIpInfo(IP_INFO_TOKEN).then(response => response)

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
  } else {
    throw new Error(
      'if you want serverLocationInfo your config must have the TOKEN.IP_INFO_TOKEN AND withServerLocationInfo must be true.',
    )
  }
}

export const getIpInfo = (IP_INFO_TOKEN: string): Promise<IpInfo> =>
  fetch(`https://ipinfo.io?token=${IP_INFO_TOKEN}`).then(response =>
    response.json(),
  )
