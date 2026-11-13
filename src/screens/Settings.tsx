import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { useDialogs } from '../components/Dialogs'
import { db } from '../db'
import { useSettings } from '../hooks'
import { exportBackup, importBackup, readBackup } from '../lib/backup'
import { fmtClock, fmtDate, fmtNum } from '../lib/format'
import type { Settings as S } from '../types'

const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]

export function Settings() {
  const dialogs = useDialogs()
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(async () => ({
    workouts: await db.workouts.count(),
    routines: await db.routines.count(),
  }), [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const save = (patch: Partial<S>) => db.settings.put({ ...settings, ...patch })

  async function doExport() {
    try {
      const res = await exportBackup()
      if (res !== 'cancelled') dialogs.toast('Backup erstellt')
    } catch {
      dialogs.toast('Backup fehlgeschlagen')
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const data = await readBackup(file)
      const ok = await dialogs.confirm({
        title: 'Backup einspielen?',
        message: `Backup vom ${fmtDate(data.exportedAt)} mit ${data.workouts.length} Workouts und ${data.routines.length} Routinen. Deine aktuellen Daten auf diesem Gerät werden ersetzt.`,
        confirmLabel: 'Einspielen',
        danger: true,
      })
      if (!ok) return
      await importBackup(data)
      dialogs.toast('Backup eingespielt')
    } catch (err) {
      dialogs.toast(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Einstellungen</h1>

      <p className="group-label">Training</p>
      <div className="set-group">
        <div className="set-item">
          <span className="grow">Pausenzeit</span>
          <div className="stepper">
            <button className="icon-btn grey" onClick={() => save({ restSeconds: Math.max(15, settings.restSeconds - 15) })}>
              −
            </button>
            <span className="val">{fmtClock(settings.restSeconds)}</span>
            <button className="icon-btn grey" onClick={() => save({ restSeconds: Math.min(900, settings.restSeconds + 15) })}>
              +
            </button>
          </div>
        </div>
        <div className="set-item">
          <span className="grow">Gewicht der Stange</span>
          <div className="stepper">
            <button className="icon-btn grey" onClick={() => save({ barKg: Math.max(0, settings.barKg - 2.5) })}>
              −
            </button>
            <span className="val">{fmtNum(settings.barKg)} kg</span>
            <button className="icon-btn grey" onClick={() => save({ barKg: settings.barKg + 2.5 })}>
              +
            </button>
          </div>
        </div>
      </div>
      <p className="group-foot">Der Pausen-Timer startet automatisch, sobald du einen Satz abhakst.</p>

      <p className="group-label">Verfügbare Hantelscheiben (für den Scheiben-Rechner)</p>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {ALL_PLATES.map((p) => {
          const on = settings.plates.includes(p)
          return (
            <button
              key={p}
              className={`chip${on ? ' on' : ''}`}
              onClick={() =>
                save({ plates: on ? settings.plates.filter((x) => x !== p) : [...settings.plates, p].sort((a, b) => b - a) })
              }
            >
              {fmtNum(p)} kg
            </button>
          )
        })}
      </div>

      <p className="group-label">Daten & Backup</p>
      <div className="set-group">
        <button className="set-item" onClick={doExport}>
          <Icon name="folder" />
          <span className="grow">Backup exportieren</span>
          <span className="muted small">{settings.lastBackup ? fmtDate(settings.lastBackup) : 'noch nie'}</span>
        </button>
        <button className="set-item" onClick={() => fileRef.current?.click()}>
          <Icon name="history" />
          <span className="grow">Backup einspielen</span>
        </button>
      </div>
      <input
        ref={fileRef}
        className="hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <p className="group-foot">
        Alles bleibt auf diesem Handy, es gibt kein Konto und keine Cloud. Speichere ab und zu ein Backup in der
        Dateien-App oder in iCloud Drive, damit nichts verloren geht. {counts
          ? `${counts.workouts} ${counts.workouts === 1 ? 'Workout' : 'Workouts'}, ${counts.routines} ${counts.routines === 1 ? 'Routine' : 'Routinen'} gespeichert.`
          : ''}
      </p>

      <p className="group-label">App</p>
      <div className="set-group">
        <div className="set-item">
          <span className="grow">Als App installiert</span>
          <span className="muted">{standalone ? 'Ja' : 'Nein'}</span>
        </div>
        <div className="set-item">
          <span className="grow">Speicher dauerhaft</span>
          <span className="muted">{persisted === null ? '—' : persisted ? 'Ja' : 'Nein'}</span>
        </div>
      </div>
      {!standalone && (
        <p className="group-foot">
          Am iPhone: diese Seite in Safari öffnen, unten auf Teilen tippen und „Zum Home-Bildschirm“ wählen. Dann
          startet Satzbuch wie eine normale App, läuft offline und iOS löscht deine Daten nicht.
        </p>
      )}
    </div>
  )
}
