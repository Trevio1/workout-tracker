import { db, getSettings, uid } from '../db'
import type { ActiveWorkout, Exercise, ExerciseEntry, Routine, Settings, SetRow, Workout } from '../types'
import { suggest, type Suggestion } from './progression'
import { lastSetsByExercise, sessionsFor } from './stats'

export function newSet(partial: Partial<SetRow> = {}): SetRow {
  return { id: uid(), kg: null, reps: null, warmup: false, done: false, ...partial }
}

interface Context {
  workouts: Workout[]
  previous: Map<string, SetRow[]>
  exercises: Map<string, Exercise>
  settings: Settings
}

async function loadContext(): Promise<Context> {
  const workouts = await db.workouts.orderBy('start').reverse().limit(300).toArray()
  const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]))
  return { workouts, previous: lastSetsByExercise(workouts), exercises, settings: await getSettings() }
}

export function suggestionFor(
  exerciseId: string,
  workSetCount: number,
  ctx: { workouts: Workout[]; exercises: Map<string, Exercise>; settings: Settings },
): Suggestion | null {
  const ex = ctx.exercises.get(exerciseId)
  if (!ex || ex.category === 'cardio') return null
  return suggest(ex, sessionsFor(exerciseId, ctx.workouts), workSetCount, ctx.settings)
}

/** Writes the suggestion into the grey placeholders of the work sets */
export function applySuggestion(sets: SetRow[], s: Suggestion | null): SetRow[] {
  if (!s || s.kind === 'norange') return sets
  let j = 0
  return sets.map((set) => {
    if (set.warmup) return set
    const reps = s.reps[j] ?? s.reps[s.reps.length - 1]
    j += 1
    return { ...set, hintKg: s.kg ?? set.hintKg ?? null, hintReps: reps || (set.hintReps ?? null) }
  })
}

/** Builds the sets for an exercise added to a live workout, hinted from the last time */
export async function entryForExercise(exerciseId: string): Promise<ExerciseEntry> {
  const ctx = await loadContext()
  const prev = ctx.previous.get(exerciseId) ?? []
  const count = Math.max(prev.length, 1)
  const sets = Array.from({ length: count }, (_, i) =>
    newSet({ warmup: prev[i]?.warmup ?? false, hintKg: prev[i]?.kg ?? null, hintReps: prev[i]?.reps ?? null }),
  )
  const work = sets.filter((x) => !x.warmup).length
  return { id: uid(), exerciseId, sets: applySuggestion(sets, suggestionFor(exerciseId, work, ctx)) }
}

export async function startWorkout(routine?: Routine): Promise<void> {
  const ctx = await loadContext()
  const exercises: ExerciseEntry[] = (routine?.exercises ?? []).map((e) => {
    const last = ctx.previous.get(e.exerciseId) ?? []
    // Fill down: a planned set without values takes the hint of the set above
    let kgAbove: number | null = null
    let repsAbove: number | null = null
    const sets = e.sets.map((s, i) => {
      const hintKg = last[i]?.kg ?? s.kg ?? kgAbove
      const hintReps = last[i]?.reps ?? s.reps ?? repsAbove
      kgAbove = hintKg
      repsAbove = hintReps
      return newSet({ warmup: s.warmup, hintKg, hintReps })
    })
    const work = sets.filter((x) => !x.warmup).length
    return { id: uid(), exerciseId: e.exerciseId, sets: applySuggestion(sets, suggestionFor(e.exerciseId, work, ctx)) }
  })
  const active: ActiveWorkout = {
    id: 'active',
    routineId: routine?.id,
    name: routine?.name ?? defaultWorkoutName(),
    start: Date.now(),
    exercises,
  }
  await db.active.put(active)
}

function defaultWorkoutName(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Morgen-Workout'
  if (h < 17) return 'Mittags-Workout'
  return 'Abend-Workout'
}

export async function saveActive(a: ActiveWorkout): Promise<void> {
  await db.active.put(a)
}

export async function cancelWorkout(): Promise<void> {
  await db.active.delete('active')
}

/** Counts sets that are not ticked off yet */
export function openSetCount(a: ActiveWorkout): number {
  return a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0)
}

/** Strips unticked sets and empty exercises, returns finished workout */
export function toFinished(a: ActiveWorkout): Workout {
  const exercises = a.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done).map(stripHints) }))
    .filter((e) => e.sets.length > 0)
  return {
    id: uid(),
    routineId: a.routineId,
    name: a.name,
    note: a.note,
    start: a.start,
    end: Date.now(),
    exercises,
  }
}

function stripHints(s: SetRow): SetRow {
  return { id: s.id, kg: s.kg, reps: s.reps, warmup: s.warmup, done: s.done }
}

export function routineDiffers(routine: Routine, w: Workout): boolean {
  if (routine.exercises.length !== w.exercises.length) return true
  return routine.exercises.some((e, i) => {
    const o = w.exercises[i]
    return o.exerciseId !== e.exerciseId || o.sets.length !== e.sets.length
  })
}

export function entriesToPlan(entries: ExerciseEntry[]): ExerciseEntry[] {
  return entries.map((e) => ({
    id: uid(),
    exerciseId: e.exerciseId,
    sets: e.sets.map((s) => newSet({ kg: s.kg, reps: s.reps, warmup: s.warmup })),
  }))
}

export async function finishWorkout(w: Workout, updateRoutine: boolean): Promise<void> {
  await db.transaction('rw', db.workouts, db.active, db.routines, async () => {
    await db.workouts.add(w)
    await db.active.delete('active')
    if (updateRoutine && w.routineId) {
      await db.routines.update(w.routineId, { exercises: entriesToPlan(w.exercises) })
    }
  })
}

export async function saveAsRoutine(name: string, entries: ExerciseEntry[]): Promise<string> {
  const last = await db.routines.orderBy('order').last()
  const id = uid()
  await db.routines.add({
    id,
    name,
    exercises: entriesToPlan(entries),
    order: (last?.order ?? 0) + 1,
    createdAt: Date.now(),
  })
  return id
}

export async function restSeconds(): Promise<number> {
  return (await getSettings()).restSeconds
}
