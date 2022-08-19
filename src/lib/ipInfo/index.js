import { config } from '../buildConfig'
import { assertIsTrue } from '../utilities/assertValueCheckers'

export const buildServerLocationData = async withServerLocationInfo => {
  const { TOKENS } = { ...config }

  assertIsTrue(
    withServerLocationInfo ? TOKENS?.IP_INFO_TOKEN : true,
    'if you want serverLocationInfo your config must have the TOKEN.IP_INFO_TOKEN AND withServerLocationInfo must be true.',
  )

  if (withServerLocationInfo && TOKENS?.IP_INFO_TOKEN) {
    const ipInfo = await getIpInfo(TOKENS?.IP_INFO_TOKEN).then(
      response => response,
    )

    const serverLocationData = {
      CITY: ipInfo.city,
      COUNTRY: ipInfo.country,
      HOSTNAME: ipInfo.hostname,
      IP: ipInfo.ip,
      LOC: ipInfo.loc,
      POSTAL: ipInfo.postal,
      REGION: ipInfo.region,
      TIMEZONE: ipInfo.timezone,
    }

    return serverLocationData
  }

  return undefined
}

export const getIpInfo = IP_INFO_TOKEN =>
  fetch(`https://ipinfo.io/110.174.218.10?token=${IP_INFO_TOKEN}`).then(
    response => response.json(),
  )
