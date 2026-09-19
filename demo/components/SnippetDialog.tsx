import { useRef, useState } from 'react'
import type { DemoIds } from '../ids'
import { createSnippet } from '../snippet'

export const SnippetDialog = ({ ids }: { ids: DemoIds }) => {
  const dialog = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const snippet = createSnippet(ids)

  const copy = async () => {
    // The clipboard can be missing (plain HTTP) or refused; the dialog shows the code either way.
    const done = await navigator.clipboard?.writeText(snippet).then(
      () => true,
      () => false,
    )
    setCopied(done === true)
    dialog.current?.showModal()
  }

  return (
    <section className="panel" aria-labelledby="setup-title">
      <h2 id="setup-title">Your setup</h2>
      <p className="hint">
        The code for what you tried here, with your IDs if you gave them.
      </p>
      <button type="button" onClick={() => void copy()}>
        Copy setup code
      </button>
      <dialog ref={dialog} aria-labelledby="snippet-title">
        <h2 id="snippet-title">
          {copied ? 'Copied to your clipboard' : 'Copy this setup'}
        </h2>
        <pre>
          <code>{snippet}</code>
        </pre>
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </dialog>
    </section>
  )
}
