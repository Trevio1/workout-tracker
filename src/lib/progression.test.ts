import { describe, expect, it } from 'vitest'
import { setFeedback, stepFor, suggest } from './progression'
import type { Session } from './stats'
import type { Exercise, Settings, SetRow } from '../types'

const settings: Settings = { id: 'settings', restSeconds: 120, barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] }

const machine: Exercise = { id: 'm', name: 'Brustpresse', category: 'machine', muscle: 'Brust', repMin: 5, repMax: 8 }
const barbell: Exercise = { id: 'b', name: 'Kniebeuge', category: 'barbell', muscle: 'Beine', repMin: 5, repMax: 8 }
const dumbbell: Exercise = { id: 'd', name: 'Seitheben', category: 'dumbbell', muscle: 'Schultern', repMin: 6, repMax: 10 }

let day = 0
function session(kg: number | null, reps: number[], warmup?: { kg: number; reps: number }): Session {
  day += 1
  const sets: SetRow[] = reps.map((r, i) => ({ id: `${day}-${i}`, kg, reps: r, warmup: false, done: true }))
  if (warmup) sets.unshift({ id: `${day}-w`, kg: warmup.kg, reps: warmup.reps, warmup: true, done: true })
  return { workoutId: `w${day}`, date: day * 86400000, name: 'Test', sets, maxKg: kg ?? 0, bestE1rm: 0, volume: 0 }
}

describe('suggest', () => {
  it('first session: no weight, aim for the bottom of the range', () => {
    const s = suggest(machine, [], 2, settings)
    expect(s.kind).toBe('first')
    expect(s.kg).toBeNull()
    expect(s.reps).toEqual([5, 5])
  })

  it('top of range in all sets -> one step up, back to repMin', () => {
    const s = suggest(machine, [session(50, [8, 8])], 2, settings)
    expect(s.kind).toBe('increase')
    expect(s.kg).toBe(52.5)
    expect(s.reps).toEqual([5, 5])
  })

  it('clearly above the range -> bigger jump based on estimated 1RM', () => {
    const s = suggest(machine, [session(50, [10, 10])], 2, settings)
    expect(s.kind).toBe('increase')
    expect(s.kg).toBe(55)
  })

  it('only one set at the top -> chase reps, same weight', () => {
    const s = suggest(machine, [session(50, [8, 6])], 2, settings)
    expect(s.kind).toBe('reps')
    expect(s.kg).toBe(50)
    expect(s.reps).toEqual([8, 7])
  })

  it('below the range right after an increase -> hold', () => {
    const s = suggest(machine, [session(50, [8, 8]), session(52.5, [5, 4])], 2, settings)
    expect(s.kind).toBe('hold')
    expect(s.kg).toBe(52.5)
    expect(s.reason).toContain('Nach der Erhöhung')
  })

  it('twice below the range at the same weight -> one step back', () => {
    const s = suggest(machine, [session(52.5, [4, 4]), session(52.5, [4, 3])], 2, settings)
    expect(s.kind).toBe('decrease')
    expect(s.kg).toBe(50)
  })

  it('three sessions without progress -> deload about 10 %', () => {
    const s = suggest(machine, [session(60, [6, 6]), session(60, [6, 5]), session(60, [6, 6])], 2, settings)
    expect(s.kind).toBe('deload')
    expect(s.kg).toBe(52.5)
  })

  it('progressing reps over three sessions is not a stall', () => {
    const s = suggest(machine, [session(60, [5, 5]), session(60, [6, 5]), session(60, [7, 6])], 2, settings)
    expect(s.kind).toBe('reps')
    expect(s.reps).toEqual([8, 7])
  })

  it('ignores warm-up sets', () => {
    const s = suggest(machine, [session(50, [8, 8], { kg: 20, reps: 12 })], 2, settings)
    expect(s.kind).toBe('increase')
    expect(s.kg).toBe(52.5)
  })

  it('barbell increase lands on a loadable weight', () => {
    const ex: Exercise = { ...barbell, step: 2 }
    const s = suggest(ex, [session(100, [8, 8])], 2, settings)
    // 102 is not loadable with these plates, 102.5 is
    expect(s.kg).toBe(102.5)
  })

  it('heavy barbell just at the top -> only one step, no big jump', () => {
    const s = suggest(barbell, [session(100, [8, 8])], 2, settings)
    expect(s.kg).toBe(102.5)
  })

  it('heavy barbell far past the top -> jumps capped at 3 steps', () => {
    const s = suggest(barbell, [session(100, [12, 12])], 2, settings)
    expect(s.kg).toBe(107.5)
  })

  it('extends targets to the planned number of sets', () => {
    const s = suggest(machine, [session(50, [6, 6])], 3, settings)
    expect(s.reps).toEqual([7, 7, 7])
  })

  it('without a rep range it falls back to last values', () => {
    const ex: Exercise = { ...machine, repMin: undefined, repMax: undefined }
    const s = suggest(ex, [session(40, [10, 9])], 2, settings)
    expect(s.kind).toBe('norange')
    expect(s.kg).toBe(40)
    expect(s.reps).toEqual([10, 9])
  })

  it('bodyweight without load -> suggests adding weight', () => {
    const ex: Exercise = { id: 'p', name: 'Dips', category: 'bodyweight', muscle: 'Brust', repMin: 6, repMax: 10 }
    const s = suggest(ex, [session(null, [10, 10])], 2, settings)
    expect(s.kind).toBe('increase')
    expect(s.label).toContain('+2,5')
  })
})

describe('stepFor', () => {
  it('uses the explicit step', () => {
    expect(stepFor({ ...machine, step: 5 }, [])).toBe(5)
  })
  it('learns the smallest jump from history', () => {
    expect(stepFor(dumbbell, [session(10, [10]), session(12, [8]), session(14, [7])])).toBe(2)
  })
  it('falls back to the category default', () => {
    expect(stepFor(dumbbell, [])).toBe(2)
    expect(stepFor(machine, [])).toBe(2.5)
  })
  it('ignores unrealistically large jumps', () => {
    expect(stepFor(machine, [session(40, [8]), session(60, [8])])).toBe(2.5)
  })
})

describe('setFeedback', () => {
  it('praises sets above the range and warns below', () => {
    expect(setFeedback(machine, 9, false)).toContain('mehr Gewicht')
    expect(setFeedback(machine, 4, false)).toContain('zu schwer')
    expect(setFeedback(machine, 6, false)).toBeNull()
    expect(setFeedback(machine, 12, true)).toBeNull()
  })
})
