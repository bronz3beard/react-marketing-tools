/**
 * A browser fingerprint from FingerprintJS, for `visitorId: { fingerprint: fingerprintjs() }`. Install the MIT-licensed
 * v5 first: `npm install @fingerprintjs/fingerprintjs@^5` (4.x is under a non-open-source licence).
 *
 * FingerprintJS is loaded the first time the library asks for a visitor ID, which is only with the visitor's analytics
 * and advertising consent, so apps that never get consent never download it.
 */
export const fingerprintjs = (): (() => Promise<string>) => async () => {
  const { load } = await import('@fingerprintjs/fingerprintjs')
  // `monitoring: false` stops the agent's statistics request to FingerprintJS's servers.
  const agent = await load({ monitoring: false })
  const { visitorId } = await agent.get()
  return visitorId
}
