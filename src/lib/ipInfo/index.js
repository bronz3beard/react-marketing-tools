import { config } from '../buildConfig'
import { assertIsTrue } from '../utilities/assertValueCheckers'

export const buildServerLocationData = async withServerLocationInfo => {
  const { TOKENS } = { ...config }

  assertIsTrue(
    withServerLocationInfo ? TOKENS?.IP_INFO_TOKEN : true,
    'if you want serverLocationInfo your config must have the TOKEN.IP_INFO_TOKEN AND withServerLocationInfo must be true.',
  )

  if (withServerLocationInfo && TOKENS?.IP_INFO_TOKEN) {
    const ipInfo = await getIpInfo(TOKENS.IP_INFO_TOKEN).then(
      response => response,
    )

    const serverLocationData = {
      city: ipInfo.city,
      country: ipInfo.country,
      hostname: ipInfo.hostname,
      ip: ipInfo.ip,
      loc: ipInfo.loc,
      postal: ipInfo.postal,
      region: ipInfo.region,
      timezone: ipInfo.timezone,
    }

    return serverLocationData
  }

  return undefined
}

export const getIpInfo = IP_INFO_TOKEN =>
  fetch(`https://ipinfo.io/110.174.218.10?token=${IP_INFO_TOKEN}`).then(
    response => response.json(),
  )
