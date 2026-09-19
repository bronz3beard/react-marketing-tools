import { AnalyticsError } from '../core/errors.js'
import type { EventParams, Journey } from '../core/types.js'
import { randomUuid } from '../shared/uuid.js'

/** A journey built only on `track`, so every destination, validation rule and the relay apply to its events. */
export const createJourney = ({
  name,
  track,
  fail,
}: {
  name: string
  track: (eventName: string, params: EventParams) => void
  fail: (error: AnalyticsError) => void
}): Journey => {
  const journey = { journey_id: randomUuid(), journey_name: name }
  let started = false
  let ended: 'completed' | 'abandoned' | undefined
  let stepCount = 0
  let lastStep: string | undefined

  // journey_start goes out with the first call rather than on creation, so creating a journey during render sends
  // nothing. Calls after the journey ended are mistakes.
  const begin = (call: string): boolean => {
    if (ended) {
      fail(
        new AnalyticsError(
          'journey_ended',
          `journey "${name}" is already ${ended}, so ${call} was ignored`,
        ),
      )
      return false
    }
    if (!started) {
      started = true
      track('journey_start', journey)
    }
    return true
  }

  return {
    step(stepName, params = {}) {
      if (!begin(`step("${stepName}")`)) return
      stepCount += 1
      lastStep = stepName
      track('journey_step', {
        ...params,
        ...journey,
        step_name: stepName,
        step_index: stepCount,
      })
    },
    complete(params = {}) {
      if (!begin('complete()')) return
      ended = 'completed'
      track('journey_complete', {
        ...params,
        ...journey,
        step_count: stepCount,
      })
    },
    abandon(reason) {
      if (!begin('abandon()')) return
      ended = 'abandoned'
      track('journey_abandon', {
        ...journey,
        step_count: stepCount,
        ...(lastStep && { step_name: lastStep }),
        ...(reason && { reason }),
      })
    },
  }
}
