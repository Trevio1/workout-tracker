import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { useDialogs } from '../components/Dialogs'
import { db, uid } from '../db'
import { useExercises, useSettings } from '../hooks'
import { useNav } from '../nav'
import { startWorkout } from '../lib/actions'
import { exportBackup } from '../lib/backup'
import { fmtDate } from '../lib/format'
import type { Routine } from '../types'

export function useStartWorkout() {
  const nav = useNav()
  const dialogs = useDialogs()
  return async (routine?: Routine) => {
    const existing = await db.active.get('active')
    if (existing) {
      const ok = await dialogs.confirm({
        title: 'Workout läuft schon',
        message: `„${existing.name}“ ist noch offen. Verwerfen und neues starten?`,
        confirmLabel: 'Neu starten',
        cancelLabel: 'Zum Workout',
        danger: true,
      })
      if (!ok) {
        nav.setActiveOpen(true)
        return
      }
    }
    await startWorkout(routine)
    nav.setActiveOpen(true)
  }
}

export function Home() {
  const nav = useNav()
  const dialogs = useDialogs()
  const exercises = useExercises()
  const settings = useSettings()
  const start = useStartWorkout()
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const workouts = useLiveQuery(() => db.workouts.orderBy('start').reverse().toArray(), [])

  const lastByRoutine = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of workouts ?? []) if (w.routineId && !m.has(w.routineId)) m.set(w.routineId, w.start)
    return m
  }, [workouts])

  const daysSinceBackup = settings.lastBackup ? Math.floor((Date.now() - settings.lastBackup) / 86400000) : null
  const needsBackup = (workouts?.length ?? 0) >= 3 && (daysSinceBackup === null || daysSinceBackup >= 14)

  async function cardMenu(r: Routine, index: number) {
    const list = routines ?? []
    const choice = await dialogs.menu(
      [
        { id: 'start', label: 'Workout starten', bold: true },
        { id: 'edit', label: 'Bearbeiten' },
        { id: 'dup', label: 'Duplizieren' },
        ...(index > 0 ? [{ id: 'up', label: 'Nach vorne' }] : []),
        ...(index < list.length - 1 ? [{ id: 'down', label: 'Nach hinten' }] : []),
        { id: 'del', label: 'Löschen', danger: true },
      ],
      r.name,
    )
    if (choice === 'start') await start(r)
    if (choice === 'edit') nav.push({ type: 'routine-edit', id: r.id })
    if (choice === 'dup') {
      const last = list[list.length - 1]
      await db.routines.add({ ...r, id: uid(), name: `${r.name} (Kopie)`, order: (last?.order ?? 0) + 1, createdAt: Date.now() })
    }
    if (choice === 'up' || choice === 'down') {
      const other = list[choice === 'up' ? index - 1 : index + 1]
      await db.transaction('rw', db.routines, async () => {
        await db.routines.update(r.id, { order: other.order })
        await db.routines.update(other.id, { order: r.order })
      })
    }
    if (choice === 'del') {
      const ok = await dialogs.confirm({
        title: 'Routine löschen?',
        message: `„${r.name}“ wird gelöscht. Deine bisherigen Workouts bleiben im Verlauf.`,
        confirmLabel: 'Löschen',
        danger: true,
      })
      if (ok) await db.routines.delete(r.id)
    }
  }

  async function backupNow() {
    try {
      const res = await exportBackup()
      if (res !== 'cancelled') dialogs.toast('Backup erstellt')
    } catch {
      dialogs.toast('Backup fehlgeschlagen')
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Training</h1>

      {needsBackup && (
        <button className="banner" onClick={backupNow}>
          <Icon name="folder" size={20} />
          <span>
            {daysSinceBackup === null
              ? 'Du hast noch kein Backup. Deine Daten liegen nur auf diesem Handy.'
              : `Letztes Backup vor ${daysSinceBackup} Tagen.`}{' '}
            <b>Jetzt sichern</b>
          </span>
        </button>
      )}

      <p className="label">Schnellstart</p>
      <button className="btn btn-primary btn-block" onClick={() => start()}>
        Leeres Workout starten
      </button>

      <div className="section-head">
        <h2>Routinen</h2>
        <div className="row">
          <button
            className="btn btn-soft btn-sm"
            onClick={() => nav.push({ type: 'plan-import' })}
            aria-label="Plan per Foto importieren"
          >
            <Icon name="camera" size={18} /> Import
          </button>
          <button className="btn btn-soft btn-sm" onClick={() => nav.push({ type: 'routine-edit' })}>
            <Icon name="plus" size={18} /> Routine
          </button>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 4 }}>
        <h3>Meine Routinen ({routines?.length ?? 0})</h3>
      </div>

      {routines && routines.length === 0 && (
        <div className="empty">
          Noch keine Routine. Lege deinen ersten Trainingsplan an, zum Beispiel „Push“, „Pull“ und „Beine“.
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-soft btn-sm" onClick={() => nav.push({ type: 'routine-edit' })}>
              <Icon name="plus" size={18} /> Erste Routine anlegen
            </button>
            <button className="btn btn-soft btn-sm" onClick={() => nav.push({ type: 'plan-import' })}>
              <Icon name="camera" size={18} /> Plan per Foto importieren
            </button>
          </div>
        </div>
      )}

      <div className="grid2">
        {(routines ?? []).map((r, i) => {
          const last = lastByRoutine.get(r.id)
          const names = r.exercises.map((e) => exercises.get(e.exerciseId)?.name ?? '?')
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              className="rcard"
              onClick={() => nav.push({ type: 'routine-preview', id: r.id })}
            >
              <div className="rcard-title">{r.name}</div>
              <button
                className="icon-btn"
                aria-label="Optionen"
                onClick={(e) => {
                  e.stopPropagation()
                  void cardMenu(r, i)
                }}
              >
                <Icon name="dots" size={20} />
              </button>
              <div className="rcard-sub">{names.length ? names.join(', ') : 'Keine Übungen'}</div>
              {last && (
                <div className="rcard-date">
                  <Icon name="clock" size={14} /> {fmtDate(last)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
