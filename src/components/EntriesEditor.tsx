import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { Keypad, type KeypadKey } from './Keypad'
import { ExercisePicker } from './ExercisePicker'
import { useDialogs } from './Dialogs'
import { db } from '../db'
import { fieldLabels } from '../hooks'
import { entryForExercise, newSet } from '../lib/actions'
import { fmtNum, fmtSet, parseNum } from '../lib/format'
import { unlockAudio } from '../lib/sound'
import { setFeedback, stepFor, type Suggestion } from '../lib/progression'
import { editRange, editStep, rangeText } from './exerciseSettings'
import type { Exercise, ExerciseEntry, Field, SetRow, Settings } from '../types'

export type EditorMode = 'live' | 'plan' | 'edit'

interface Focus {
  entryId: string
  setId: string
  field: Field
}

interface Props {
  mode: EditorMode
  entries: ExerciseEntry[]
  onChange: (entries: ExerciseEntry[]) => void
  exercises: Map<string, Exercise>
  settings: Settings
  previous?: Map<string, SetRow[]>
  onSetDone?: () => void
  onOpenExercise?: (id: string) => void
  onKeypadChange?: (open: boolean) => void
  /** progression suggestion for an entry (live mode) */
  suggestFor?: (entry: ExerciseEntry) => Suggestion | null
  /** effective weight step for an exercise, learned from history */
  stepOf?: (exerciseId: string) => number
  z: number
}

function draftOf(n: number | null): string {
  return n === null ? '' : fmtNum(n).replace(/\./g, '')
}

export function EntriesEditor({
  mode,
  entries,
  onChange,
  exercises,
  settings,
  previous,
  onSetDone,
  onOpenExercise,
  onKeypadChange,
  suggestFor,
  stepOf,
  z,
}: Props) {
  const dialogs = useDialogs()
  const [focus, setFocus] = useState<Focus | null>(null)
  const [draft, setDraft] = useState('')
  const fresh = useRef(true)
  const [picker, setPicker] = useState<null | { replace?: string }>(null)

  useEffect(() => onKeypadChange?.(focus !== null), [focus, onKeypadChange])

  useEffect(() => {
    if (!focus) return
    const el = document.querySelector(`[data-cell="${focus.setId}-${focus.field}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focus])

  const showCheck = mode === 'live'
  const showPrev = mode === 'live'

  // ---------- helpers ----------

  const updateEntry = (entryId: string, fn: (e: ExerciseEntry) => ExerciseEntry) =>
    onChange(entries.map((e) => (e.id === entryId ? fn(e) : e)))

  const updateSet = (entryId: string, setId: string, patch: Partial<SetRow>) =>
    updateEntry(entryId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))

  function findSet(f: Focus): SetRow | undefined {
    return entries.find((e) => e.id === f.entryId)?.sets.find((s) => s.id === f.setId)
  }

  function openCell(f: Focus) {
    unlockAudio()
    const s = entries.find((e) => e.id === f.entryId)?.sets.find((x) => x.id === f.setId)
    setDraft(draftOf(s ? s[f.field] : null))
    fresh.current = true
    setFocus(f)
  }

  function nextFocus(f: Focus): Focus | null {
    if (f.field === 'kg') return { ...f, field: 'reps' }
    const entry = entries.find((e) => e.id === f.entryId)
    if (!entry) return null
    const idx = entry.sets.findIndex((s) => s.id === f.setId)
    const nextSet = entry.sets[idx + 1]
    if (nextSet) return { entryId: entry.id, setId: nextSet.id, field: 'kg' }
    return null
  }

  function onKey(k: KeypadKey) {
    if (!focus) return
    const set = findSet(focus)
    if (!set) return
    let d = draft
    if (/^\d$/.test(k)) {
      d = fresh.current ? k : (draft + k).slice(0, 6)
      if (d.length > 1 && d.startsWith('0') && !d.startsWith('0,')) d = d.slice(1)
      fresh.current = false
    } else if (k === ',') {
      if (focus.field === 'reps') return
      if (fresh.current) d = '0,'
      else if (!draft.includes(',')) d = (draft || '0') + ','
      fresh.current = false
    } else if (k === 'back') {
      d = fresh.current ? '' : draft.slice(0, -1)
      fresh.current = false
    } else if (k === 'plus' || k === 'minus') {
      const hint = focus.field === 'kg' ? set.hintKg : set.hintReps
      const base = parseNum(draft) ?? hint ?? 0
      const step = focus.field === 'kg' ? 2.5 : 1
      const v = Math.max(0, Math.round((base + (k === 'plus' ? step : -step)) * 100) / 100)
      d = draftOf(v)
      fresh.current = true
    } else if (k === 'next') {
      const n = nextFocus(focus)
      if (n) openCell(n)
      else setFocus(null)
      return
    } else if (k === 'hide') {
      setFocus(null)
      return
    }
    setDraft(d)
    updateSet(focus.entryId, focus.setId, { [focus.field]: parseNum(d) })
  }

  function toggleDone(entry: ExerciseEntry, set: SetRow) {
    unlockAudio()
    if (set.done) {
      updateSet(entry.id, set.id, { done: false })
      return
    }
    const idx = entry.sets.findIndex((s) => s.id === set.id)
    const above = idx > 0 ? entry.sets[idx - 1] : undefined
    const kg = set.kg ?? set.hintKg ?? above?.kg ?? null
    const reps = set.reps ?? set.hintReps ?? above?.reps ?? null
    if (kg === null && reps === null) {
      dialogs.toast('Erst Gewicht oder Wiederholungen eintragen')
      openCell({ entryId: entry.id, setId: set.id, field: 'kg' })
      return
    }
    setFocus(null)
    updateSet(entry.id, set.id, { kg, reps, done: true })
    onSetDone?.()
    const ex = exercises.get(entry.exerciseId)
    const tip = ex ? setFeedback(ex, reps, set.warmup) : null
    if (tip) dialogs.toast(tip)
  }

  function applyToOpenSets(entry: ExerciseEntry, sg: Suggestion) {
    let j = 0
    updateEntry(entry.id, (e) => ({
      ...e,
      sets: e.sets.map((s) => {
        if (s.warmup) return s
        const reps = sg.reps[j] ?? sg.reps[sg.reps.length - 1] ?? null
        j += 1
        if (s.done) return s
        return { ...s, kg: sg.kg ?? s.kg, reps: reps || s.reps }
      }),
    }))
  }

  async function chipMenu(entry: ExerciseEntry, ex: Exercise, sg: Suggestion | null) {
    const canApply = sg && sg.kind !== 'norange' && sg.kind !== 'first' && mode === 'live'
    const range = rangeText(ex)
    const choice = await dialogs.menu(
      [
        ...(canApply ? [{ id: 'apply', label: 'In offene Sätze übernehmen', bold: true }] : []),
        { id: 'range', label: range ? `Bereich ändern (${range})` : 'Wiederholungsbereich festlegen' },
        ...(ex.category !== 'bodyweight' ? [{ id: 'step', label: 'Gewichtsschritt ändern' }] : []),
      ],
      sg?.reason ?? (range ? `Ziel: ${range}` : 'Lege einen Bereich fest, z. B. 6-10.'),
    )
    if (choice === 'apply' && sg) applyToOpenSets(entry, sg)
    if (choice === 'range') await editRange(ex, dialogs)
    if (choice === 'step') await editStep(ex, stepOf?.(ex.id) ?? stepFor(ex, []), dialogs)
  }

  function addSet(entry: ExerciseEntry) {
    const last = entry.sets[entry.sets.length - 1]
    const prev = previous?.get(entry.exerciseId)?.[entry.sets.length]
    const s = newSet({
      hintKg: prev?.kg ?? last?.kg ?? last?.hintKg ?? null,
      hintReps: prev?.reps ?? last?.reps ?? last?.hintReps ?? null,
    })
    if (mode !== 'live') {
      s.kg = s.hintKg ?? null
      s.reps = s.hintReps ?? null
      s.done = mode === 'edit'
    }
    updateEntry(entry.id, (e) => ({ ...e, sets: [...e.sets, s] }))
  }

  function removeSet(entry: ExerciseEntry, setId: string) {
    if (focus?.setId === setId) setFocus(null)
    updateEntry(entry.id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }))
  }

  async function setMenu(entry: ExerciseEntry, set: SetRow) {
    const choice = await dialogs.menu([
      { id: 'warm', label: set.warmup ? 'Als normalen Satz markieren' : 'Als Aufwärmsatz markieren' },
      { id: 'del', label: 'Satz löschen', danger: true },
    ])
    if (choice === 'warm') updateSet(entry.id, set.id, { warmup: !set.warmup })
    if (choice === 'del') removeSet(entry, set.id)
  }

  async function editNote(ex: Exercise) {
    const v = await dialogs.prompt({
      title: 'Notiz zur Übung',
      message: 'Wird bei jedem Workout mit dieser Übung angezeigt.',
      value: ex.note ?? '',
      multiline: true,
      placeholder: 'z. B. Sitz auf Stufe 4, Griff eng',
    })
    if (v === null) return
    await db.exercises.update(ex.id, { note: v.trim() || undefined })
  }

  async function entryMenu(entry: ExerciseEntry, index: number) {
    const ex = exercises.get(entry.exerciseId)
    const choice = await dialogs.menu(
      [
        { id: 'note', label: ex?.note ? 'Notiz bearbeiten' : 'Notiz anheften' },
        ...(ex && ex.category !== 'cardio' ? [{ id: 'range', label: 'Wiederholungsbereich' }] : []),
        ...(index > 0 ? [{ id: 'up', label: 'Nach oben' }] : []),
        ...(index < entries.length - 1 ? [{ id: 'down', label: 'Nach unten' }] : []),
        { id: 'replace', label: 'Übung ersetzen' },
        { id: 'remove', label: 'Übung entfernen', danger: true },
      ],
      ex?.name,
    )
    if (choice === 'note' && ex) await editNote(ex)
    if (choice === 'range' && ex) await editRange(ex, dialogs)
    if (choice === 'up' || choice === 'down') {
      const next = [...entries]
      const j = choice === 'up' ? index - 1 : index + 1
      ;[next[index], next[j]] = [next[j], next[index]]
      onChange(next)
    }
    if (choice === 'replace') setPicker({ replace: entry.id })
    if (choice === 'remove') {
      setFocus(null)
      onChange(entries.filter((e) => e.id !== entry.id))
    }
  }

  async function onPicked(ids: string[]) {
    const replaceId = picker?.replace
    setPicker(null)
    if (ids.length === 0) return
    if (replaceId) {
      const fresh = await entryForExercise(ids[0])
      onChange(entries.map((e) => (e.id === replaceId ? { ...fresh, id: e.id } : e)))
      return
    }
    const added = await Promise.all(ids.map((id) => entryForExercise(id)))
    if (mode !== 'live') {
      for (const a of added) {
        a.sets = a.sets.map((s) => ({ ...s, kg: s.hintKg ?? null, reps: s.hintReps ?? null, done: mode === 'edit' }))
      }
    }
    onChange([...entries, ...added])
  }

  // ---------- render ----------

  const focusEntry = focus ? entries.find((e) => e.id === focus.entryId) : undefined
  const focusSet = focus ? findSet(focus) : undefined
  const focusEx = focusEntry ? exercises.get(focusEntry.exerciseId) : undefined

  return (
    <>
      {entries.map((entry, index) => {
        const ex = exercises.get(entry.exerciseId)
        const labels = fieldLabels(ex?.category)
        const prev = previous?.get(entry.exerciseId) ?? []
        let workIndex = 0
        return (
          <div className="ex-block" key={entry.id}>
            <div className="ex-head">
              <button className="ex-name" onClick={() => ex && onOpenExercise?.(ex.id)}>
                {ex?.name ?? 'Unbekannte Übung'}
              </button>
              <button className="icon-btn" onClick={() => entryMenu(entry, index)} aria-label="Optionen">
                <Icon name="dots" size={20} />
              </button>
            </div>
            {ex && ex.category !== 'cardio' && (() => {
              const sg = mode === 'live' ? (suggestFor?.(entry) ?? null) : null
              const kind = sg?.kind ?? (ex.repMin ? 'range' : 'norange')
              const label = sg?.label ?? rangeText(ex) ?? 'Bereich festlegen'
              if (mode === 'edit') return null
              return (
                <button className={`prog-chip ${kind}`} onClick={() => chipMenu(entry, ex, sg)}>
                  {label}
                  {sg && ex.repMin && sg.kind !== 'first' && <span className="prog-range">{rangeText(ex)}</span>}
                </button>
              )
            })()}
            {ex?.note && (
              <button className="pin-note" onClick={() => editNote(ex)}>
                <span>{ex.note}</span>
                <span className="pin">
                  <Icon name="pin" size={16} />
                </span>
              </button>
            )}
            <div className={`sets${showCheck ? '' : ' no-check'}${showPrev ? '' : ' no-prev'}`}>
              <div className="set-head">
                <span>Satz</span>
                {showPrev && <span>Vorher</span>}
                <span>{labels.kg}</span>
                <span>{labels.reps}</span>
                {showCheck && (
                  <span>
                    <Icon name="check" size={18} />
                  </span>
                )}
              </div>
              {entry.sets.map((set, si) => {
                if (!set.warmup) workIndex += 1
                const p = prev[si]
                return (
                  <SwipeRow key={set.id} onDelete={() => removeSet(entry, set.id)}>
                    <div className={`set-row${set.done && showCheck ? ' done' : ''}`}>
                      <button className={`set-num${set.warmup ? ' warm' : ''}`} onClick={() => setMenu(entry, set)}>
                        {set.warmup ? 'W' : workIndex}
                      </button>
                      {showPrev && (
                        <button
                          className="prev"
                          onClick={() => p && updateSet(entry.id, set.id, { kg: p.kg, reps: p.reps })}
                        >
                          {p ? fmtSet(p.kg, p.reps, labels.kg.replace('+', '')) : '—'}
                        </button>
                      )}
                      {(['kg', 'reps'] as Field[]).map((field) => {
                        const v = set[field]
                        const hint = field === 'kg' ? set.hintKg : set.hintReps
                        const isFocus = focus?.setId === set.id && focus.field === field
                        return (
                          <button
                            key={field}
                            data-cell={`${set.id}-${field}`}
                            className={`cell${v === null ? ' hint' : ''}${isFocus ? ' focus' : ''}`}
                            onClick={() => openCell({ entryId: entry.id, setId: set.id, field })}
                          >
                            {v !== null ? fmtNum(v) : hint != null ? fmtNum(hint) : ''}
                          </button>
                        )
                      })}
                      {showCheck && (
                        <button className="check" onClick={() => toggleDone(entry, set)} aria-label="Satz abhaken">
                          <Icon name="check" size={20} stroke={3} />
                        </button>
                      )}
                    </div>
                  </SwipeRow>
                )
              })}
            </div>
            <button className="btn btn-grey btn-sm btn-block add-set" onClick={() => addSet(entry)}>
              <Icon name="plus" size={16} /> Satz hinzufügen
            </button>
          </div>
        )
      })}

      <div className="big-actions">
        <button className="btn btn-soft btn-block" onClick={() => setPicker({})}>
          Übungen hinzufügen
        </button>
      </div>

      {focus && focusSet && (
        <Keypad
          draft={draft}
          hint={focus.field === 'kg' ? (focusSet.hintKg ?? null) : (focusSet.hintReps ?? null)}
          field={focus.field}
          unit={fieldLabels(focusEx?.category)[focus.field].replace('+', '')}
          showPlates={focusEx?.category === 'barbell'}
          settings={settings}
          onKey={onKey}
        />
      )}

      {picker && <ExercisePicker z={z + 5} single={Boolean(picker.replace)} onClose={onPicked} />}
    </>
  )
}

function SwipeRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null)
  const [dx, setDx] = useState(0)

  return (
    <div
      className="swipe-wrap"
      onTouchStart={(e) => {
        const t = e.touches[0]
        start.current = { x: t.clientX, y: t.clientY, locked: null }
      }}
      onTouchMove={(e) => {
        const s = start.current
        if (!s) return
        const t = e.touches[0]
        const mx = t.clientX - s.x
        const my = t.clientY - s.y
        if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my)
        if (s.locked) setDx(Math.min(0, mx))
      }}
      onTouchEnd={() => {
        if (dx < -110) onDelete()
        setDx(0)
        start.current = null
      }}
    >
      {dx < 0 && <div className="swipe-del">Löschen</div>}
      <div style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .2s' }}>
        {children}
      </div>
    </div>
  )
}
