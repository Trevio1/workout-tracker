import type { Exercise, Workout } from '../types'
import { workoutVolume } from './stats'

const DAY = 86400000

/** Monday 00:00 local time of the week containing t */
export function startOfWeek(t: number): number {
  const d = new Date(t)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime()
}

export function addWeeks(weekStart: number, n: number): number {
  const d = new Date(weekStart)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7).getTime()
}

export function dayKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export interface MuscleSets {
  muscle: string
  sets: number
}

export function inWeek(workouts: Workout[], weekStart: number): Workout[] {
  const end = addWeeks(weekStart, 1)
  return workouts.filter((w) => w.start >= weekStart && w.start < end)
}

/** Hard sets (done, not warm-up) per primary muscle */
export function setsByMuscle(workouts: Workout[], exercises: Map<string, Exercise>): MuscleSets[] {
  const m = new Map<string, number>()
  for (const w of workouts) {
    for (const e of w.exercises) {
      const ex = exercises.get(e.exerciseId)
      if (!ex || ex.category === 'cardio') continue
      const n = e.sets.filter((s) => s.done && !s.warmup).length
      if (n) m.set(ex.muscle, (m.get(ex.muscle) ?? 0) + n)
    }
  }
  return [...m.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)
}

/** Weeks in a row with at least one workout. The running week only counts once it has one. */
export function weekStreak(workouts: Workout[], now = Date.now()): number {
  const weeks = new Set(workouts.map((w) => startOfWeek(w.start)))
  let wk = startOfWeek(now)
  if (!weeks.has(wk)) wk = addWeeks(wk, -1)
  let n = 0
  while (weeks.has(wk)) {
    n += 1
    wk = addWeeks(wk, -1)
  }
  return n
}

export interface MonthStats {
  workouts: number
  volume: number
}

export function monthStats(workouts: Workout[], monthOffset: number, now = Date.now()): MonthStats {
  const d = new Date(now)
  const start = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1).getTime()
  const end = new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 1).getTime()
  const list = workouts.filter((w) => w.start >= start && w.start < end)
  return { workouts: list.length, volume: list.reduce((s, w) => s + workoutVolume(w), 0) }
}

/** 12 weeks x 7 days, oldest week first; each cell is a day start timestamp */
export function calendarGrid(weeks = 12, now = Date.now()): number[][] {
  const first = addWeeks(startOfWeek(now), -(weeks - 1))
  return Array.from({ length: weeks }, (_, w) => {
    const ws = addWeeks(first, w)
    const d = new Date(ws)
    return Array.from({ length: 7 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getTime())
  })
}

export { DAY }
