import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { useDialogs } from '../components/Dialogs'
import { db } from '../db'
import { useNav } from '../nav'
import { fmtSet } from '../lib/format'
import { applyImport, buildPrompt, parsePlan, resolvePlan, type ResolvedRoutine } from '../lib/planImport'

export function ImportPlan({ z }: { z: number }) {
  const nav = useNav()
  const dialogs = useDialogs()
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const [text, setText] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [busy, setBusy] = useState(false)

  const prompt = useMemo(() => buildPrompt(exercises ?? []), [exercises])

  const result = useMemo((): { plan: ResolvedRoutine[] } | { error: string } | null => {
    if (!text.trim()) return null
    try {
      return { plan: resolvePlan(parsePlan(text), exercises ?? []) }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Antwort konnte nicht gelesen werden.' }
    }
  }, [text, exercises])

  const plan = result && 'plan' in result ? result.plan : null

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      dialogs.toast('Prompt kopiert')
    } catch {
      // clipboard blocked: show the text so it can be copied by hand
      setShowPrompt(true)
    }
  }

  async function pasteAnswer() {
    try {
      const t = await navigator.clipboard.readText()
      if (t.trim()) setText(t)
      else dialogs.toast('Zwischenablage ist leer')
    } catch {
      dialogs.toast('Bitte lang ins Feld tippen und „Einsetzen“ wählen')
    }
  }

  async function doImport() {
    if (!plan) return
    setBusy(true)
    try {
      const res = await applyImport(plan)
      dialogs.toast(`${res.routines} ${res.routines === 1 ? 'Routine' : 'Routinen'} importiert`)
      nav.pop()
    } catch {
      dialogs.toast('Import fehlgeschlagen')
      setBusy(false)
    }
  }

  const newCount = plan
    ? new Set(plan.flatMap((r) => r.exercises.filter((e) => !e.existingId).map((e) => e.name.toLowerCase()))).size
    : 0

  return (
    <Sheet
      z={z}
      title="Plan importieren"
      onBackdrop={nav.pop}
      left={
        <button className="link" onClick={nav.pop}>
          Abbrechen
        </button>
      }
      footer={
        plan && (
          <div className="rest-bar">
            <button className="btn btn-primary btn-block" disabled={busy} onClick={doImport}>
              {plan.length} {plan.length === 1 ? 'Routine' : 'Routinen'} importieren
            </button>
          </div>
        )
      }
    >
      <p className="muted" style={{ lineHeight: 1.45, marginTop: 4 }}>
        Claude liest deinen Plan vom Foto oder Screenshot ab. Das läuft über deine Claude-App, Satzbuch selbst schickt
        nichts ins Internet.
      </p>

      <div className="step">
        <div className="step-num">1</div>
        <div className="grow">
          <b>Prompt kopieren</b>
          <div className="muted small">Der Prompt sagt Claude, in welchem Format die Antwort kommen soll.</div>
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={copyPrompt}>
              <Icon name="copy" size={16} /> Prompt kopieren
            </button>
            <button className="btn btn-grey btn-sm" onClick={() => setShowPrompt((v) => !v)}>
              {showPrompt ? 'Ausblenden' : 'Anzeigen'}
            </button>
          </div>
          {showPrompt && (
            <textarea
              className="text-input"
              readOnly
              value={prompt}
              style={{ marginTop: 10, minHeight: 160, fontSize: 13 }}
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      </div>

      <div className="step">
        <div className="step-num">2</div>
        <div className="grow">
          <b>In Claude senden</b>
          <div className="muted small">
            Neuen Chat öffnen, Prompt einfügen, Foto(s) von deinem Plan anhängen und abschicken. Mehrere Trainingstage
            auf einmal gehen auch.
          </div>
          <a className="btn btn-soft btn-sm" style={{ marginTop: 10, textDecoration: 'none' }} href="https://claude.ai/new" target="_blank" rel="noreferrer">
            Claude öffnen
          </a>
        </div>
      </div>

      <div className="step">
        <div className="step-num">3</div>
        <div className="grow">
          <b>Antwort hier einfügen</b>
          <div className="muted small">Unter Claudes Antwort auf „Kopieren“ tippen, dann hier einfügen.</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={pasteAnswer}>
            <Icon name="paste" size={16} /> Einfügen
          </button>
          <textarea
            className="text-input"
            placeholder="Antwort von Claude"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ marginTop: 10, minHeight: 90, fontSize: 13 }}
          />
        </div>
      </div>

      {result && 'error' in result && <div className="banner" style={{ marginTop: 14 }}>{result.error}</div>}

      {plan && (
        <>
          <div className="section-head">
            <h3>Vorschau</h3>
            {newCount > 0 && (
              <span className="muted small">
                {newCount} {newCount === 1 ? 'Übung wird' : 'Übungen werden'} neu angelegt
              </span>
            )}
          </div>
          {plan.map((r, ri) => (
            <div className="hcard" key={ri}>
              <h4 style={{ marginBottom: 8 }}>{r.name}</h4>
              <div className="hlines">
                {r.exercises.map((e, ei) => {
                  const first = e.sets.find((s) => !s.warmup) ?? e.sets[0]
                  return (
                    <div className="hline" key={ei}>
                      <span>
                        {e.sets.length} × {e.name}
                        {!e.existingId && <span className="badge-new">neu</span>}
                      </span>
                      <span>{first && (first.kg !== null || first.reps !== null) ? fmtSet(first.kg, first.reps) : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="group-foot">Deine bestehenden Routinen bleiben erhalten. Nach dem Import kannst du alles normal bearbeiten.</p>
        </>
      )}
    </Sheet>
  )
}
