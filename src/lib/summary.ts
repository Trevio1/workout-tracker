import type { Exercise, Settings, Workout } from '../types'
import { suggest } from './progression'
import { e1rm, sessionsFor, workoutVolume } from './stats'

export type RecordKind = 'kg' | 'e1rm' | 'reps'

export interface PersonalRecord {
  exerciseId: string
  kind: RecordKind
  value: number
  previous: number
  /** weight for rep records */
  kg?: number
}

export interface Summary {
  volume: number
  sets: number
  reps: number
  previous?: { volume: number; sets: number; reps: number; date: number }
  records: PersonalRecord[]
  increased: { exerciseId: string; from: number; to: number }[]
  readyNext: string[]
}

const totalReps = (w: Workout) =>
  w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).reduce((m, s) => m + (s.reps ?? 0), 0), 0)
const totalSets = (w: Workout) => w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0)

export function summarize(
  w: Workout,
  all: Workout[],
  exercises: Map<string, Exercise>,
  settings: Settings,
): Summary {
  const before = all.filter((x) => x.id !== w.id && x.start < w.start)
  const prevSame = before
    .filter((x) => (w.routineId ? x.routineId === w.routineId : x.name === w.name))
    .sort((a, b) => b.start - a.start)[0]

  const records: PersonalRecord[] = []
  const increased: Summary['increased'] = []
  const readyNext: string[] = []

  for (const entry of w.exercises) {
    const ex = exercises.get(entry.exerciseId)
    if (!ex || ex.category === 'cardio') continue
    const earlier = sessionsFor(entry.exerciseId, before)
    const work = entry.sets.filter((s) => s.done && !s.warmup)
    if (earlier.length > 0 && work.length > 0) {
      const weighted = work.some((s) => (s.kg ?? 0) > 0)
      const maxKg = Math.max(...work.map((s) => s.kg ?? 0))
      const prevMaxKg = Math.max(...earlier.map((s) => s.maxKg))
      const best = Math.max(...work.map((s) => e1rm(s.kg, s.reps)))
      const prevBest = Math.max(...earlier.map((s) => s.bestE1rm))
      if (weighted && maxKg > prevMaxKg) {
        records.push({ exerciseId: ex.id, kind: 'kg', value: maxKg, previous: prevMaxKg })
      } else if (weighted && best > prevBest + 0.05) {
        records.push({ exerciseId: ex.id, kind: 'e1rm', value: best, previous: prevBest })
      } else {
        // more reps than ever at the same weight
        for (const s of work) {
          const kg = s.kg ?? 0
          const prevReps = Math.max(
            0,
            ...earlier.flatMap((x) => x.sets.filter((y) => !y.warmup && (y.kg ?? 0) === kg).map((y) => y.reps ?? 0)),
          )
          if (prevReps > 0 && (s.reps ?? 0) > prevReps) {
            records.push({ exerciseId: ex.id, kind: 'reps', value: s.reps ?? 0, previous: prevReps, kg })
            break
          }
        }
      }
      const last = earlier[earlier.length - 1]
      if (weighted && last.maxKg > 0 && maxKg > last.maxKg) {
        increased.push({ exerciseId: ex.id, from: last.maxKg, to: maxKg })
      }
    }
    const withThis = sessionsFor(entry.exerciseId, [...before, w])
    const sg = suggest(ex, withThis, Math.max(1, work.length), settings)
    if (sg.kind === 'increase') readyNext.push(ex.id)
  }

  return {
    volume: workoutVolume(w),
    sets: totalSets(w),
    reps: totalReps(w),
    previous: prevSame
      ? { volume: workoutVolume(prevSame), sets: totalSets(prevSame), reps: totalReps(prevSame), date: prevSame.start }
      : undefined,
    records,
    increased,
    readyNext,
  }
}
