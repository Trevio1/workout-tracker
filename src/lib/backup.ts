import { db, DEFAULT_SETTINGS } from '../db'
import type { Exercise, Routine, Settings, Workout } from '../types'

interface BackupFile {
  app: 'satzbuch'
  version: 1
  exportedAt: number
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  settings: Settings
}

export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data: BackupFile = {
    app: 'satzbuch',
    version: 1,
    exportedAt: Date.now(),
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    workouts: await db.workouts.toArray(),
    settings: (await db.settings.get('settings')) ?? DEFAULT_SETTINGS,
  }
  const stamp = new Date().toISOString().slice(0, 10)
  const fileName = `satzbuch-backup-${stamp}.json`
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const file = new File([blob], fileName, { type: 'application/json' })

  let result: 'shared' | 'downloaded' | 'cancelled'
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Satzbuch Backup' })
      result = 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      throw err
    }
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    result = 'downloaded'
  }
  await db.settings.update('settings', { lastBackup: Date.now() })
  return result
}

function isBackup(x: unknown): x is BackupFile {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  return (
    o.app === 'satzbuch' &&
    Array.isArray(o.exercises) &&
    Array.isArray(o.routines) &&
    Array.isArray(o.workouts)
  )
}

export async function readBackup(file: File): Promise<BackupFile> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  if (!isBackup(parsed)) throw new Error('Das ist keine Satzbuch-Backup-Datei.')
  return parsed
}

export async function importBackup(data: BackupFile): Promise<void> {
  await db.transaction('rw', [db.exercises, db.routines, db.workouts, db.settings], async () => {
    await Promise.all([db.exercises.clear(), db.routines.clear(), db.workouts.clear()])
    await db.exercises.bulkAdd(data.exercises)
    await db.routines.bulkAdd(data.routines)
    await db.workouts.bulkAdd(data.workouts)
    await db.settings.put({ ...DEFAULT_SETTINGS, ...data.settings, id: 'settings' })
  })
}
