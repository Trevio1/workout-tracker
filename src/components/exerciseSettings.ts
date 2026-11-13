import { db } from '../db'
import { fmtNum, parseNum } from '../lib/format'
import type { Exercise } from '../types'
import type { useDialogs } from './Dialogs'

type Dialogs = ReturnType<typeof useDialogs>

export function rangeText(ex: Exercise): string | null {
  if (!ex.repMin || !ex.repMax) return null
  return ex.repMin === ex.repMax ? `${ex.repMin} Wdh.` : `${ex.repMin}–${ex.repMax} Wdh.`
}

export async function editRange(ex: Exercise, dialogs: Dialogs): Promise<void> {
  const v = await dialogs.prompt({
    title: 'Wiederholungsbereich',
    message: 'Schaffst du in allen Sätzen das obere Ende, schlägt die App mehr Gewicht vor. Leer lassen = kein Bereich.',
    value: ex.repMin && ex.repMax ? `${ex.repMin}-${ex.repMax}` : '',
    placeholder: 'z. B. 6-10',
  })
  if (v === null) return
  const t = v.trim()
  if (t === '') {
    await db.exercises.update(ex.id, { repMin: undefined, repMax: undefined })
    return
  }
  const m = t.match(/^(\d+)\s*(?:[-–—]|bis)?\s*(\d+)?$/)
  const a = m ? Number(m[1]) : NaN
  const b = m && m[2] ? Number(m[2]) : a
  if (!a || !b || a > b || b > 100) {
    dialogs.toast('Bitte so eingeben: 6-10')
    return
  }
  await db.exercises.update(ex.id, { repMin: a, repMax: b })
  dialogs.toast(`Bereich ${a}–${b} gespeichert`)
}

export async function editStep(ex: Exercise, learned: number, dialogs: Dialogs): Promise<void> {
  const v = await dialogs.prompt({
    title: 'Gewichtsschritt',
    message: `Um wie viel kg erhöhst du bei dieser Übung? Leer lassen = automatisch (aktuell ${fmtNum(learned)} kg).`,
    value: ex.step ? fmtNum(ex.step) : '',
    placeholder: fmtNum(learned),
  })
  if (v === null) return
  const n = parseNum(v)
  if (v.trim() !== '' && (n === null || n <= 0 || n > 50)) {
    dialogs.toast('Bitte eine Zahl wie 2,5 eingeben')
    return
  }
  await db.exercises.update(ex.id, { step: n ?? undefined })
}
