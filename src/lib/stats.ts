import type { SetRow, Workout } from '../types'

/** Epley estimate of one-rep max */
export function e1rm(kg: number | null, reps: number | null): number {
  if (!kg || !reps) return 0
  if (reps === 1) return kg
  return kg * (1 + reps / 30)
}

export function workSets(sets: SetRow[]): SetRow[] {
  return sets.filter((s) => s.done && !s.warmup)
}

export function volume(sets: SetRow[]): number {
  return workSets(sets).reduce((sum, s) => sum + (s.kg ?? 0) * (s.reps ?? 0), 0)
}

export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, e) => sum + volume(e.sets), 0)
}

/** Sets of the most recent finished workout containing each exercise */
export function lastSetsByExercise(workouts: Workout[]): Map<string, SetRow[]> {
  const map = new Map<string, SetRow[]>()
  const sorted = [...workouts].sort((a, b) => b.start - a.start)
  for (const w of sorted) {
    for (const e of w.exercises) {
      if (!map.has(e.exerciseId)) map.set(e.exerciseId, e.sets.filter((s) => s.done))
    }
  }
  return map
}

export interface Session {
  workoutId: string
  date: number
  name: string
  sets: SetRow[]
  maxKg: number
  bestE1rm: number
  volume: number
  bestSet?: SetRow
}

export function sessionsFor(exerciseId: string, workouts: Workout[]): Session[] {
  const out: Session[] = []
  for (const w of workouts) {
    const entries = w.exercises.filter((e) => e.exerciseId === exerciseId)
    if (entries.length === 0) continue
    const sets = entries.flatMap((e) => e.sets.filter((s) => s.done))
    const ws = workSets(sets)
    let bestSet: SetRow | undefined
    let best = 0
    for (const s of ws) {
      const v = e1rm(s.kg, s.reps)
      if (v > best) {
        best = v
        bestSet = s
      }
    }
    out.push({
      workoutId: w.id,
      date: w.start,
      name: w.name,
      sets,
      maxKg: ws.reduce((m, s) => Math.max(m, s.kg ?? 0), 0),
      bestE1rm: best,
      volume: volume(sets),
      bestSet,
    })
  }
  return out.sort((a, b) => a.date - b.date)
}
