import type { Exercise, Settings, SetRow } from '../types'
import { fmtNum } from './format'
import { platesFor } from './plates'
import { e1rm, type Session } from './stats'

export type SuggestionKind = 'first' | 'increase' | 'reps' | 'hold' | 'decrease' | 'deload' | 'norange'

export interface Suggestion {
  kind: SuggestionKind
  /** suggested working weight (null = no weight / unknown) */
  kg: number | null
  /** target reps per work set */
  reps: number[]
  /** short text for the chip */
  label: string
  /** why the app suggests this */
  reason: string
}

interface TopSets {
  kg: number
  reps: number[]
}

const DEFAULT_STEP: Record<Exercise['category'], number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 2.5,
  cable: 2.5,
  bodyweight: 2.5,
  kettlebell: 4,
  cardio: 0,
  other: 2.5,
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Work sets at the heaviest weight of a session (back-off and warm-up sets are ignored) */
export function topSets(sets: SetRow[]): TopSets | null {
  const work = sets.filter((s) => s.done && !s.warmup && s.reps !== null)
  if (work.length === 0) return null
  const kg = Math.max(...work.map((s) => s.kg ?? 0))
  return { kg, reps: work.filter((s) => (s.kg ?? 0) === kg).map((s) => s.reps ?? 0) }
}

/** Weight step: user setting, else smallest jump seen in history, else a default per category */
export function stepFor(ex: Exercise, sessions: Session[]): number {
  if (ex.step && ex.step > 0) return ex.step
  const weights = [...new Set(sessions.map((s) => topSets(s.sets)?.kg ?? 0).filter((k) => k > 0))].sort((a, b) => a - b)
  let learned = Infinity
  for (let i = 1; i < weights.length; i++) learned = Math.min(learned, round2(weights[i] - weights[i - 1]))
  if (learned >= 0.5 && learned <= 5) return learned
  return DEFAULT_STEP[ex.category] || 2.5
}

/** Nearest loadable barbell weight at or above `kg` */
function loadableUp(kg: number, settings: Settings): number {
  for (let k = kg; k < kg + 10; k = round2(k + 0.25)) {
    if (platesFor(k, settings.barKg, settings.plates).exact) return k
  }
  return kg
}

/** Nearest loadable barbell weight at or below `kg` */
function loadableDown(kg: number, settings: Settings): number {
  const r = platesFor(kg, settings.barKg, settings.plates)
  return Math.max(settings.barKg, r.achieved)
}

const repsText = (reps: number[]) => reps.join(' · ')

/**
 * Double progression: work inside the rep range, add weight once every work set hits the top.
 * `sessions` must be sorted oldest first (as returned by sessionsFor).
 */
export function suggest(ex: Exercise, sessions: Session[], setCount: number, settings: Settings): Suggestion {
  const count = Math.max(1, setCount)
  const fill = (n: number) => Array.from({ length: count }, () => n)
  const min = ex.repMin
  const max = ex.repMax
  const history = sessions.map((s) => ({ s, top: topSets(s.sets) })).filter((x): x is { s: Session; top: TopSets } => x.top !== null)
  const last = history[history.length - 1]?.top

  if (!min || !max) {
    return {
      kind: 'norange',
      kg: last?.kg || null,
      reps: last ? Array.from({ length: count }, (_, i) => last.reps[i] ?? last.reps[last.reps.length - 1]) : fill(0),
      label: 'Bereich festlegen',
      reason: 'Lege einen Wiederholungsbereich fest (z. B. 6–10), dann schlägt dir die App vor, wann du steigern kannst.',
    }
  }

  if (!last) {
    return {
      kind: 'first',
      kg: null,
      reps: fill(min),
      label: `Erstes Mal · ${min}–${max} Wdh.`,
      reason: `Wähle ein Gewicht, mit dem du sauber am unteren Ende landest (${min} Wdh.). Ab dem nächsten Mal rechnet die App für dich.`,
    }
  }

  const step = stepFor(ex, sessions)
  const isBarbell = ex.category === 'barbell'
  const weighted = last.kg > 0
  const lastText = weighted ? `${repsText(last.reps)} bei ${fmtNum(last.kg)} kg` : `${repsText(last.reps)} Wdh.`

  // 1) every work set at or above the top of the range -> add weight
  if (last.reps.every((r) => r >= max)) {
    if (!weighted) {
      return {
        kind: 'increase',
        kg: step,
        reps: fill(min),
        label: `↑ +${fmtNum(step)} kg`,
        reason: `Letztes Mal ${lastText}, oberes Ende (${max}) in allen Sätzen. Nimm Zusatzgewicht oder eine schwerere Variante.`,
      }
    }
    // estimate how far we can jump: the conservative 1RM of the weakest set must still allow `min` reps
    const est = Math.min(...last.reps.map((r) => e1rm(last.kg, r)))
    let jumps = 1
    // only jump further when every set went past the top, never when the top was just reached
    const pastTop = Math.min(...last.reps) > max
    for (let n = 3; pastTop && n > 1; n--) {
      const kg = last.kg + n * step
      if (30 * (est / kg - 1) >= min) {
        jumps = n
        break
      }
    }
    let kg = round2(last.kg + jumps * step)
    if (isBarbell) kg = loadableUp(kg, settings)
    return {
      kind: 'increase',
      kg,
      reps: fill(min),
      label: `↑ ${fmtNum(kg)} kg`,
      reason:
        `Letztes Mal ${lastText}, oberes Ende (${max}) in allen Sätzen geschafft. ` +
        (jumps > 1
          ? `Du hattest deutlich Luft, deshalb ${jumps} Schritte auf einmal. Ziel jetzt ${min} Wdh.`
          : `Mehr Gewicht, Ziel jetzt wieder ${min} Wdh.`),
    }
  }

  const below = last.reps.some((r) => r < min)
  const prev = history[history.length - 2]?.top

  // 2) twice in a row below the range at the same weight -> one step back
  if (below && weighted && prev && prev.kg === last.kg && prev.reps.some((r) => r < min)) {
    let kg = Math.max(0, round2(last.kg - step))
    if (isBarbell) kg = loadableDown(kg, settings)
    return {
      kind: 'decrease',
      kg,
      reps: fill(min),
      label: `↓ ${fmtNum(kg)} kg`,
      reason: `Zweimal in Folge unter ${min} Wdh. bei ${fmtNum(last.kg)} kg. Ein Schritt zurück, dann wieder sauber hocharbeiten.`,
    }
  }

  // 3) stalled for 3 sessions at the same weight -> short deload
  const last3 = history.slice(-3)
  if (weighted && last3.length === 3 && last3.every((h) => h.top.kg === last.kg)) {
    const totals = last3.map((h) => h.top.reps.reduce((a, b) => a + b, 0))
    if (totals[2] <= totals[0] && totals[1] <= totals[0]) {
      const cut = Math.max(step, Math.ceil((last.kg * 0.1) / step) * step)
      let kg = Math.max(0, round2(last.kg - cut))
      if (isBarbell) kg = loadableDown(kg, settings)
      return {
        kind: 'deload',
        kg,
        reps: fill(max),
        label: `Deload ${fmtNum(kg)} kg`,
        reason: `Seit 3 Einheiten kein Fortschritt bei ${fmtNum(last.kg)} kg. Eine Einheit mit etwa 10 % weniger und sauberer Technik, danach geht es meist wieder hoch.`,
      }
    }
  }

  // 4) below the range once -> hold the weight
  if (below) {
    const justIncreased = prev && prev.kg < last.kg
    return {
      kind: 'hold',
      kg: weighted ? last.kg : null,
      reps: fill(min),
      label: weighted ? `Halten ${fmtNum(last.kg)} kg` : `Ziel ${min} Wdh.`,
      reason: justIncreased
        ? `Nach der Erhöhung ist das normal (${lastText}). Gewicht halten und auf ${min} Wdh. aufbauen.`
        : `Letztes Mal ${lastText}, unter ${min} Wdh. Gewicht halten und Wiederholungen aufbauen.`,
    }
  }

  // 5) inside the range -> same weight, one more rep per set
  const targets = Array.from({ length: count }, (_, i) => {
    const r = last.reps[i] ?? last.reps[last.reps.length - 1]
    return Math.min(max, r + 1)
  })
  return {
    kind: 'reps',
    kg: weighted ? last.kg : null,
    reps: targets,
    label: `Ziel ${repsText(targets)}`,
    reason: `Letztes Mal ${lastText}. Gleiches Gewicht, pro Satz eine Wiederholung mehr. Bei ${max} in allen Sätzen wird gesteigert.`,
  }
}

/** Feedback right after ticking a set off */
export function setFeedback(ex: Exercise, reps: number | null, warmup: boolean): string | null {
  if (warmup || reps === null || !ex.repMin || !ex.repMax) return null
  if (reps > ex.repMax) return 'Stark! Nächstes Mal mehr Gewicht'
  if (reps < ex.repMin) return 'Etwas zu schwer, Gewicht erst mal halten'
  return null
}
