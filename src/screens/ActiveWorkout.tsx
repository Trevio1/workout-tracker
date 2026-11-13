import { useCallback, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { EntriesEditor } from '../components/EntriesEditor'
import { RestBar } from '../components/RestBar'
import { useDialogs } from '../components/Dialogs'
import { db } from '../db'
import { useExercises, useNow, useSettings } from '../hooks'
import { useNav } from '../nav'
import {
  cancelWorkout,
  finishWorkout,
  openSetCount,
  routineDiffers,
  saveActive,
  toFinished,
} from '../lib/actions'
import { fmtClock } from '../lib/format'
import { lastSetsByExercise, sessionsFor, type Session } from '../lib/stats'
import { stepFor, suggest } from '../lib/progression'
import { unlockAudio } from '../lib/sound'
import type { ActiveWorkout as Active, ExerciseEntry, RestState } from '../types'

interface Props {
  initial: Active
  z: number
}

export function ActiveWorkout({ initial, z }: Props) {
  const nav = useNav()
  const dialogs = useDialogs()
  const exercises = useExercises()
  const settings = useSettings()
  const [w, setW] = useState<Active>(initial)
  const wRef = useRef<Active>(initial)
  const [kbOpen, setKbOpen] = useState(false)
  const now = useNow(1000)

  const history = useLiveQuery(() => db.workouts.orderBy('start').reverse().limit(200).toArray(), [])
  const previous = useMemo(() => lastSetsByExercise(history ?? []), [history])
  const exerciseIds = w.exercises.map((e) => e.exerciseId).join(',')
  const sessionsById = useMemo(() => {
    const m = new Map<string, Session[]>()
    for (const id of exerciseIds.split(',')) if (id) m.set(id, sessionsFor(id, history ?? []))
    return m
  }, [exerciseIds, history])
  const suggestFor = (entry: ExerciseEntry) => {
    const ex = exercises.get(entry.exerciseId)
    if (!ex || ex.category === 'cardio' || !history) return null
    const work = entry.sets.filter((s) => !s.warmup).length
    return suggest(ex, sessionsById.get(entry.exerciseId) ?? [], work, settings)
  }
  const stepOf = (id: string) => {
    const ex = exercises.get(id)
    return ex ? stepFor(ex, sessionsById.get(id) ?? []) : 2.5
  }

  // Always derive from the latest state so back-to-back updates don't overwrite each other
  const update = useCallback((fn: (prev: Active) => Active) => {
    const next = fn(wRef.current)
    const clean = next.rest && next.rest.endsAt < Date.now() ? { ...next, rest: undefined } : next
    wRef.current = clean
    setW(clean)
    void saveActive(clean)
  }, [])

  const setEntries = (exercisesNext: ExerciseEntry[]) => update((p) => ({ ...p, exercises: exercisesNext }))
  const setRest = (rest: RestState | undefined) => update((p) => ({ ...p, rest }))

  const startRest = (sec: number) => {
    unlockAudio()
    return { endsAt: Date.now() + sec * 1000, total: sec }
  }

  async function timerMenu() {
    unlockAudio()
    const choice = await dialogs.menu(
      [
        { id: '60', label: '1:00' },
        { id: '90', label: '1:30' },
        { id: '120', label: '2:00' },
        { id: '180', label: '3:00' },
        { id: '300', label: '5:00' },
        ...(w.rest ? [{ id: 'stop', label: 'Timer stoppen', danger: true }] : []),
      ],
      'Pausen-Timer starten',
    )
    if (!choice) return
    if (choice === 'stop') setRest(undefined)
    else setRest(startRest(Number(choice)))
  }

  async function rename() {
    const v = await dialogs.prompt({ title: 'Workout umbenennen', value: w.name })
    if (v && v.trim()) update((p) => ({ ...p, name: v.trim() }))
  }

  async function cancel() {
    const ok = await dialogs.confirm({
      title: 'Workout abbrechen?',
      message: 'Alle Eingaben dieses Workouts gehen verloren.',
      confirmLabel: 'Abbrechen',
      cancelLabel: 'Weiter trainieren',
      danger: true,
    })
    if (!ok) return
    await cancelWorkout()
    nav.setActiveOpen(false)
  }

  async function finish() {
    const done = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    if (done === 0) {
      const ok = await dialogs.confirm({
        title: 'Noch kein Satz abgehakt',
        message: 'Hake erledigte Sätze mit ✓ ab. Willst du das Workout ohne Speichern beenden?',
        confirmLabel: 'Verwerfen',
        cancelLabel: 'Zurück',
        danger: true,
      })
      if (ok) {
        await cancelWorkout()
        nav.setActiveOpen(false)
      }
      return
    }
    const open = openSetCount(w)
    if (open > 0) {
      const ok = await dialogs.confirm({
        title: 'Workout beenden?',
        message: `${open} ${open === 1 ? 'Satz ist' : 'Sätze sind'} nicht abgehakt und ${open === 1 ? 'wird' : 'werden'} nicht gespeichert.`,
        confirmLabel: 'Beenden',
        cancelLabel: 'Zurück',
      })
      if (!ok) return
    }
    const finished = toFinished(w)
    let updateRoutine = false
    if (finished.routineId) {
      const routine = await db.routines.get(finished.routineId)
      if (routine && routineDiffers(routine, wRef.current.exercises)) {
        updateRoutine = await dialogs.confirm({
          title: 'Routine aktualisieren?',
          message: `Du hast Übungen oder Sätze geändert. Soll „${routine.name}“ so übernommen werden?`,
          confirmLabel: 'Aktualisieren',
          cancelLabel: 'Behalten',
        })
      }
    }
    await finishWorkout(finished, updateRoutine ? wRef.current.exercises : null)
    nav.setActiveOpen(false)
    nav.push({ type: 'workout-summary', id: finished.id })
  }

  const restActive = w.rest && w.rest.endsAt > now

  return (
    <Sheet
      z={z}
      onBackdrop={() => nav.setActiveOpen(false)}
      bodyClass={kbOpen ? 'kb-open' : ''}
      left={
        <>
          <button className="icon-btn grey lg" onClick={() => nav.setActiveOpen(false)} aria-label="Minimieren">
            <Icon name="down" size={22} />
          </button>
          <button className="icon-btn grey lg" onClick={timerMenu} aria-label="Pausen-Timer">
            <Icon name="timer" size={22} />
          </button>
        </>
      }
      right={
        <button className="btn btn-green" style={{ height: 40 }} onClick={finish}>
          Fertig
        </button>
      }
      footer={restActive && w.rest && !kbOpen ? <RestBar rest={w.rest} onChange={setRest} /> : null}
    >
      <div className="wk-title-row">
        <button className="wk-title" onClick={rename}>
          {w.name}
        </button>
        <button className="icon-btn grey" onClick={rename} aria-label="Umbenennen">
          <Icon name="dots" size={20} />
        </button>
      </div>
      <div className="wk-clock">{fmtClock((now - w.start) / 1000)}</div>
      <textarea
        className="note-input"
        rows={1}
        placeholder="Notizen"
        value={w.note ?? ''}
        onChange={(e) => {
          const note = e.target.value
          update((p) => ({ ...p, note }))
        }}
      />

      <EntriesEditor
        mode="live"
        z={z}
        entries={w.exercises}
        onChange={setEntries}
        exercises={exercises}
        settings={settings}
        previous={previous}
        onKeypadChange={setKbOpen}
        suggestFor={suggestFor}
        stepOf={stepOf}
        onOpenExercise={(id) => nav.push({ type: 'exercise-detail', id })}
        onSetDone={() => update((p) => ({ ...p, rest: startRest(settings.restSeconds) }))}
      />

      <div className="big-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-danger-soft btn-block" onClick={cancel}>
          Workout abbrechen
        </button>
      </div>
    </Sheet>
  )
}
