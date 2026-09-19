import { useState } from 'react'
import { useAnalytics } from 'react-marketing-tools'

const STEPS = ['cart', 'shipping', 'payment']

export const JourneyStepper = () => {
  const { journey } = useAnalytics()
  // One journey per run through the flow: its ID ties the events together.
  const [checkout, setCheckout] = useState(() => journey('checkout'))
  const [stepsDone, setStepsDone] = useState(0)
  const [ended, setEnded] = useState<'completed' | 'abandoned'>()
  const nextStep = STEPS[stepsDone]

  const restart = () => {
    setCheckout(journey('checkout'))
    setStepsDone(0)
    setEnded(undefined)
  }

  return (
    <section className="panel" aria-labelledby="journey-title">
      <h2 id="journey-title">Journey</h2>
      <p className="hint">
        A checkout journey. Each button sends one event; the first also sends{' '}
        <code>journey_start</code>.
      </p>
      <ol className="steps">
        {STEPS.map((step, index) => (
          <li key={step} className={index < stepsDone ? 'done' : undefined}>
            {step}
          </li>
        ))}
      </ol>
      <div className="button-grid">
        <button
          type="button"
          disabled={!nextStep || ended !== undefined}
          onClick={() => {
            checkout.step(nextStep)
            setStepsDone(stepsDone + 1)
          }}
        >
          {nextStep ? `Step: ${nextStep}` : 'All steps done'}
        </button>
        <button
          type="button"
          disabled={ended !== undefined}
          onClick={() => {
            checkout.complete({ value: 30, currency: 'USD' })
            setEnded('completed')
          }}
        >
          Complete
        </button>
        <button
          type="button"
          disabled={ended !== undefined}
          onClick={() => {
            checkout.abandon('changed_mind')
            setEnded('abandoned')
          }}
        >
          Abandon
        </button>
        <button type="button" className="secondary" onClick={restart}>
          New journey
        </button>
      </div>
      {ended && (
        <p className="hint" role="status">
          Journey {ended}. Start a new one to try again.
        </p>
      )}
    </section>
  )
}
