import type { EventParams } from '../core/types.js'

const EVENT_ATTRIBUTE = 'data-analytics-event'
const PARAM_PREFIX = 'data-analytics-param-'

/**
 * The event a click asks for: the nearest element around the click target with `data-analytics-event`, and its
 * `data-analytics-param-*` attributes as params (`data-analytics-param-button-text` → `button_text`).
 */
export const readClickEvent = (
  target: EventTarget | null,
): { name: string; params: EventParams } | undefined => {
  if (!(target instanceof Element)) return undefined
  const element = target.closest(`[${EVENT_ATTRIBUTE}]`)
  const name = element?.getAttribute(EVENT_ATTRIBUTE)
  if (!element || !name) return undefined

  const params = Object.fromEntries(
    Array.from(element.attributes)
      .filter(attribute => attribute.name.startsWith(PARAM_PREFIX))
      .map(attribute => [
        attribute.name.slice(PARAM_PREFIX.length).replaceAll('-', '_'),
        attribute.value,
      ]),
  )
  return { name, params }
}

/** Tracks clicks on marked elements through one listener on the document, so elements added later are covered too. */
export const captureClicks = (
  track: (name: string, params: EventParams) => void,
): void => {
  document.addEventListener(
    'click',
    event => {
      const click = readClickEvent(event.target)
      if (click) track(click.name, click.params)
    },
    // Capture phase: a handler that stops propagation doesn't hide the click.
    { capture: true },
  )
}
