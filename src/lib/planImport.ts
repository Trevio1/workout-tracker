import { db, uid } from '../db'
import { CATEGORY_LABEL, type Category, type Exercise, type ExerciseEntry, type Routine } from '../types'
import { newSet } from './actions'

// ---------- Prompt ----------

export function buildPrompt(exercises: Exercise[]): string {
  const names = [...exercises].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((e) => e.name)
  const cats = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => `${c} (${CATEGORY_LABEL[c]})`).join(', ')
  return `Ich hänge Fotos oder Screenshots meines Trainingsplans an. Wandle ALLE darauf sichtbaren Trainingstage/Routinen in folgendes JSON um, damit ich sie in meine Workout-App importieren kann.

Regeln:
- Jeder Trainingstag bzw. jede Routine wird ein Eintrag in "routines". Behalte die Namen vom Foto (z. B. "Push", "Tag A", "Oberkörper").
- Übernimm die Übungen in der Reihenfolge vom Foto.
- Nutze für Übungen, wenn sie passen, GENAU einen Namen aus meiner Übungsliste unten. Wenn keine passt, nimm einen kurzen deutschen Namen.
- "category" ist einer dieser Werte: ${cats}.
- "muscle" ist die Hauptmuskelgruppe auf Deutsch (z. B. Brust, Rücken, Beine, Schultern, Bizeps, Trizeps, Bauch, Po, Waden, Cardio).
- "sets" ist eine Liste mit einem Eintrag pro Satz. "kg" und "reps" als Zahl oder null, wenn auf dem Foto nichts steht. Bei Bereichen wie 8-12 nimm die untere Zahl. Aufwärmsätze bekommen "warmup": true.
- Steht nur "3x10", dann sind das 3 Sätze mit reps 10.
- Bei Cardio: "kg" = Distanz in km, "reps" = Dauer in Minuten.
- "note" (optional): Wiederholungsbereich und Ausführungshinweis vom Foto, z. B. "5–8 Wdh. · Kabel auf Hüfthöhe, mit Schlaufe". Ohne Infos weglassen.
- Sind zwei Varianten derselben Übung im Plan (z. B. "Latzug, breiter Griff" und "Latzug, einarmig"), behalte beide Namen getrennt.
- Erfinde nichts. Wenn du etwas nicht lesen kannst, lass es weg.

Antworte NUR mit einem JSON-Codeblock in genau diesem Format:

\`\`\`json
{
  "routines": [
    {
      "name": "Push",
      "exercises": [
        {
          "name": "Bankdrücken",
          "category": "barbell",
          "muscle": "Brust",
          "note": "6–8 Wdh. · Schulterblätter zusammen",
          "sets": [
            { "kg": 80, "reps": 8 },
            { "kg": 80, "reps": 8 },
            { "kg": 80, "reps": 8 }
          ]
        }
      ]
    }
  ]
}
\`\`\`

Meine Übungsliste:
${names.join(', ')}`
}

// ---------- Parsing ----------

export interface ParsedSet {
  kg: number | null
  reps: number | null
  warmup: boolean
}

export interface ParsedExercise {
  name: string
  category: Category
  muscle: string
  note?: string
  sets: ParsedSet[]
}

export interface ParsedRoutine {
  name: string
  exercises: ParsedExercise[]
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function toNum(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const m = x.replace(',', '.').match(/\d+(\.\d+)?/)
    if (m) return Number(m[0])
  }
  return null
}

function toStr(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}

function toCategory(x: unknown): Category {
  const s = toStr(x).toLowerCase()
  if ((CATEGORIES as string[]).includes(s)) return s as Category
  const byLabel = CATEGORIES.find((c) => CATEGORY_LABEL[c].toLowerCase() === s)
  return byLabel ?? 'other'
}

function parseSets(ex: Record<string, unknown>): ParsedSet[] {
  const raw = ex.sets
  if (Array.isArray(raw)) {
    return raw.filter(isObj).map((s) => ({
      kg: toNum(s.kg ?? s.weight),
      reps: toNum(s.reps ?? s.wdh),
      warmup: s.warmup === true,
    }))
  }
  // shorthand: { sets: 3, reps: 10, kg: 60 }
  const count = Math.min(20, Math.max(1, Math.round(toNum(raw) ?? 1)))
  const kg = toNum(ex.kg ?? ex.weight)
  const reps = toNum(ex.reps)
  return Array.from({ length: count }, () => ({ kg, reps, warmup: false }))
}

/** Extracts the JSON from a pasted chat answer (code fences and surrounding text allowed) */
export function parsePlan(text: string): ParsedRoutine[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  let body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1) throw new Error('Keine Plan-Daten gefunden. Hast du die ganze Antwort von Claude eingefügt?')
  if (end <= start) throw new Error('Die Antwort ist unvollständig. Kopiere sie bitte nochmal komplett.')
  body = body.slice(start, end + 1)

  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error('Die Antwort ist unvollständig. Kopiere sie bitte nochmal komplett.')
  }

  const list = isObj(data) && Array.isArray(data.routines) ? data.routines : isObj(data) && data.name ? [data] : []
  const routines: ParsedRoutine[] = list.filter(isObj).map((r, i) => ({
    name: toStr(r.name) || `Importierte Routine ${i + 1}`,
    exercises: (Array.isArray(r.exercises) ? r.exercises : [])
      .filter(isObj)
      .map((e) => ({
        name: toStr(e.name),
        category: toCategory(e.category),
        muscle: toStr(e.muscle) || 'Sonstiges',
        note: toStr(e.note) || undefined,
        sets: parseSets(e),
      }))
      .filter((e) => e.name !== ''),
  }))
  const usable = routines.filter((r) => r.exercises.length > 0)
  if (usable.length === 0) throw new Error('In der Antwort wurden keine Übungen gefunden.')
  return usable
}

// ---------- Matching & saving ----------

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
}

export interface ResolvedExercise extends ParsedExercise {
  /** id of an existing exercise, or undefined if it will be created */
  existingId?: string
}

export interface ResolvedRoutine {
  name: string
  exercises: ResolvedExercise[]
}

export function resolvePlan(routines: ParsedRoutine[], exercises: Exercise[]): ResolvedRoutine[] {
  const byName = new Map(exercises.map((e) => [normalize(e.name), e]))
  return routines.map((r) => ({
    name: r.name,
    exercises: r.exercises.map((e) => {
      const match = byName.get(normalize(e.name))
      // show the stored spelling for matched exercises
      return match ? { ...e, name: match.name, existingId: match.id } : e
    }),
  }))
}

export async function applyImport(routines: ResolvedRoutine[]): Promise<{ routines: number; newExercises: number }> {
  let newExercises = 0
  await db.transaction('rw', db.exercises, db.routines, async () => {
    const created = new Map<string, string>()
    const last = await db.routines.orderBy('order').last()
    let order = last?.order ?? 0
    for (const r of routines) {
      const entries: ExerciseEntry[] = []
      for (const e of r.exercises) {
        let exId = e.existingId ?? created.get(normalize(e.name))
        if (!exId) {
          exId = `ex-custom-${uid()}`
          await db.exercises.add({ id: exId, name: e.name, category: e.category, muscle: e.muscle, note: e.note, custom: true })
          created.set(normalize(e.name), exId)
          newExercises += 1
        } else if (e.note) {
          // never overwrite a note the user already wrote
          const existing = await db.exercises.get(exId)
          if (existing && !existing.note) await db.exercises.update(exId, { note: e.note })
        }
        const sets = e.sets.length > 0 ? e.sets : [{ kg: null, reps: null, warmup: false }]
        entries.push({
          id: uid(),
          exerciseId: exId,
          sets: sets.map((s) => newSet({ kg: s.kg, reps: s.reps, warmup: s.warmup })),
        })
      }
      order += 1
      const routine: Routine = { id: uid(), name: r.name, exercises: entries, order, createdAt: Date.now() }
      await db.routines.add(routine)
    }
  })
  return { routines: routines.length, newExercises }
}
