import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  id: string
  label: string
  danger?: boolean
  bold?: boolean
}

interface ConfirmOpts {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PromptOpts {
  title: string
  message?: string
  value?: string
  placeholder?: string
  multiline?: boolean
  confirmLabel?: string
}

type Dialog =
  | { kind: 'menu'; title?: string; items: MenuItem[]; resolve: (v: string | null) => void }
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOpts; resolve: (v: string | null) => void }

interface DialogApi {
  menu: (items: MenuItem[], title?: string) => Promise<string | null>
  confirm: (opts: ConfirmOpts) => Promise<boolean>
  prompt: (opts: PromptOpts) => Promise<string | null>
  toast: (text: string) => void
}

const Ctx = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('DialogProvider missing')
  return v
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [toastText, setToastText] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const menu = useCallback(
    (items: MenuItem[], title?: string) =>
      new Promise<string | null>((resolve) => setDialog({ kind: 'menu', items, title, resolve })),
    [],
  )
  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', opts, resolve })),
    [],
  )
  const prompt = useCallback(
    (opts: PromptOpts) => new Promise<string | null>((resolve) => setDialog({ kind: 'prompt', opts, resolve })),
    [],
  )
  const toast = useCallback((text: string) => {
    setToastText(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastText(null), 2600)
  }, [])

  const close = () => setDialog(null)

  return (
    <Ctx.Provider value={{ menu, confirm, prompt, toast }}>
      {children}
      {dialog?.kind === 'menu' && (
        <div className="dialog-wrap">
          <div
            className="sheet-backdrop"
            onClick={() => {
              dialog.resolve(null)
              close()
            }}
          />
          <div className="action-sheet">
            <div className="action-group">
              {dialog.title && <div className="action-title">{dialog.title}</div>}
              {dialog.items.map((it) => (
                <button
                  key={it.id}
                  className={`action-item${it.danger ? ' danger' : ''}${it.bold ? ' bold' : ''}`}
                  onClick={() => {
                    dialog.resolve(it.id)
                    close()
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <div className="action-group">
              <button
                className="action-item bold"
                onClick={() => {
                  dialog.resolve(null)
                  close()
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog?.kind === 'confirm' && (
        <div className="dialog-wrap center">
          <div
            className="sheet-backdrop"
            onClick={() => {
              dialog.resolve(false)
              close()
            }}
          />
          <div className="alert" role="alertdialog">
            <h3>{dialog.opts.title}</h3>
            {dialog.opts.message && <p>{dialog.opts.message}</p>}
            <div className="actions">
              <button
                className="btn btn-grey"
                onClick={() => {
                  dialog.resolve(false)
                  close()
                }}
              >
                {dialog.opts.cancelLabel ?? 'Abbrechen'}
              </button>
              <button
                className={`btn ${dialog.opts.danger ? 'btn-danger-soft' : 'btn-primary'}`}
                onClick={() => {
                  dialog.resolve(true)
                  close()
                }}
              >
                {dialog.opts.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog?.kind === 'prompt' && (
        <PromptDialog
          opts={dialog.opts}
          onDone={(v) => {
            dialog.resolve(v)
            close()
          }}
        />
      )}
      {toastText && <div className="toast">{toastText}</div>}
    </Ctx.Provider>
  )
}

function PromptDialog({ opts, onDone }: { opts: PromptOpts; onDone: (v: string | null) => void }) {
  const [value, setValue] = useState(opts.value ?? '')
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className="dialog-wrap center">
      <div className="sheet-backdrop" onClick={() => onDone(null)} />
      <form
        className="alert"
        onSubmit={(e) => {
          e.preventDefault()
          onDone(value)
        }}
      >
        <h3>{opts.title}</h3>
        {opts.message && <p>{opts.message}</p>}
        <div className="field">
          {opts.multiline ? (
            <textarea
              ref={ref}
              className="text-input"
              value={value}
              placeholder={opts.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <input
              ref={ref}
              className="text-input"
              value={value}
              placeholder={opts.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </div>
        <div className="actions">
          <button type="button" className="btn btn-grey" onClick={() => onDone(null)}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary">
            {opts.confirmLabel ?? 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
