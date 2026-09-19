import { useState, type FormEvent } from 'react'
import { ID_FIELDS, type DemoIds } from '../ids'

export const IdsForm = ({
  ids,
  onSave,
}: {
  ids: DemoIds
  /** Returns false when the IDs couldn't be kept. */
  onSave: (ids: DemoIds) => boolean
}) => {
  const [blocked, setBlocked] = useState(false)

  const save = (next: DemoIds) => setBlocked(!onSave(next))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) return
    const data = new FormData(form)
    save(
      Object.fromEntries(
        ID_FIELDS.flatMap(({ key }) => {
          const value = String(data.get(key) ?? '').trim()
          return value ? [[key, value]] : []
        }),
      ),
    )
  }

  return (
    <section className="panel" aria-labelledby="ids-title">
      <h2 id="ids-title">Try your own IDs</h2>
      <p className="hint">
        With your IDs, the real vendor scripts load and events reach your
        accounts. The IDs are kept only in this browser. The relay stays a dry
        run.
      </p>
      <form className="ids-form" onSubmit={submit}>
        {ID_FIELDS.map(({ key, label, format, pattern }) => (
          <label key={key} className="field">
            {label}
            <input
              name={key}
              defaultValue={ids[key] ?? ''}
              pattern={pattern}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${key}-format`}
            />
            <span id={`${key}-format`} className="field-format">
              Format: {format}
            </span>
          </label>
        ))}
        <div className="button-row">
          <button type="submit">Use my IDs</button>
          <button type="button" className="secondary" onClick={() => save({})}>
            Back to placeholders
          </button>
        </div>
        {blocked && (
          <p className="hint" role="alert">
            This browser blocks storage, so the IDs can't be kept.
          </p>
        )}
      </form>
    </section>
  )
}
