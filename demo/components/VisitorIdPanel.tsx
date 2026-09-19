import { useEffect, useState } from 'react'
import { useAnalytics, type ConsentState } from 'react-marketing-tools'

export const VisitorIdPanel = ({ consent }: { consent: ConsentState }) => {
  const { getVisitorId } = useAnalytics()
  const [visitorId, setVisitorId] = useState<string>()

  // The ID depends on consent: read it again whenever consent changes.
  useEffect(() => {
    let current = true
    void getVisitorId().then(id => {
      if (current) setVisitorId(id)
    })
    return () => {
      current = false
    }
  }, [getVisitorId, consent])

  return (
    <section className="panel" aria-labelledby="visitor-title">
      <h2 id="visitor-title">Visitor ID</h2>
      <p className="hint">
        A random ID kept in this browser while analytics consent is granted
        (currently <strong>{consent.analytics}</strong>). The relay sends it to
        Meta for visitors who aren't signed in; it never reaches Google
        Analytics.
      </p>
      <p>
        {visitorId ? (
          <code>{visitorId}</code>
        ) : (
          <span className="hint">None without analytics consent.</span>
        )}
      </p>
    </section>
  )
}
