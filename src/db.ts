import Dexie, { type EntityTable } from 'dexie'
import type { ActiveWorkout, Exercise, Routine, Settings, Workout } from './types'
import { SEED_EXERCISES } from './seed'
import { rangeFromNote } from './lib/range'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  restSeconds: 120,
  barKg: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
}

export class AppDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  active!: EntityTable<ActiveWorkout, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('satzbuch')
    this.version(1).stores({
      exercises: 'id, name, category',
      routines: 'id, order',
      workouts: 'id, start',
      active: 'id',
      settings: 'id',
    })
    // v2: rep ranges as real fields, taken from notes like "5–8 Wdh. · ..."
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table<Exercise, string>('exercises')
          .toCollection()
          .modify((ex) => {
            if (ex.repMin && ex.repMax) return
            const r = rangeFromNote(ex.note)
            if (r) {
              ex.repMin = r.repMin
              ex.repMax = r.repMax
            }
          }),
      )
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(SEED_EXERCISES)
      tx.table('settings').add(DEFAULT_SETTINGS)
    })
  }
}

export const db = new AppDB()

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? DEFAULT_SETTINGS
}
