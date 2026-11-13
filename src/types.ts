export type Category =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'cardio'
  | 'other'

export interface Exercise {
  id: string
  name: string
  category: Category
  muscle: string
  note?: string
  pinned?: boolean
  custom?: boolean
}

export interface SetRow {
  id: string
  kg: number | null
  reps: number | null
  warmup: boolean
  done: boolean
  /** Placeholder shown in grey (from last workout or routine plan) */
  hintKg?: number | null
  hintReps?: number | null
}

export interface ExerciseEntry {
  id: string
  exerciseId: string
  sets: SetRow[]
}

export interface Routine {
  id: string
  name: string
  note?: string
  exercises: ExerciseEntry[]
  order: number
  createdAt: number
}

export interface Workout {
  id: string
  routineId?: string
  name: string
  note?: string
  start: number
  end: number
  exercises: ExerciseEntry[]
}

export interface RestState {
  endsAt: number
  total: number
}

export interface ActiveWorkout {
  id: 'active'
  routineId?: string
  name: string
  note?: string
  start: number
  exercises: ExerciseEntry[]
  rest?: RestState
}

export interface Settings {
  id: 'settings'
  restSeconds: number
  barKg: number
  plates: number[]
  lastBackup?: number
}

export type Field = 'kg' | 'reps'

export const CATEGORY_LABEL: Record<Category, string> = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  machine: 'Maschine',
  cable: 'Kabelzug',
  bodyweight: 'Körpergewicht',
  cardio: 'Cardio',
  other: 'Sonstiges',
}
