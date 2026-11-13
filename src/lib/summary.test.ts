import { describe, expect, it } from 'vitest'
import { summarize } from './summary'
import type { Exercise, Settings, Workout } from '../types'

const settings: Settings = { id: 'settings', restSeconds: 120, barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] }
const ex: Exercise = { id: 'bp', name: 'Brustpresse', category: 'machine', muscle: 'Brust', repMin: 5, repMax: 8 }
const exercises = new Map([[ex.id, ex]])

function wk(id: string, day: number, kg: number, reps: number[]): Workout {
  return {
    id,
    routineId: 'push',
    name: 'Push',
    start: day * 86400000,
    end: day * 86400000 + 3600000,
    exercises: [
      { id: `${id}-e`, exerciseId: ex.id, sets: reps.map((r, i) => ({ id: `${id}-${i}`, kg, reps: r, warmup: false, done: true })) },
    ],
  }
}

describe('summarize', () => {
  it('detects a weight record and the increase', () => {
    const a = wk('a', 1, 50, [8, 8])
    const b = wk('b', 3, 52.5, [6, 5])
    const s = summarize(b, [a, b], exercises, settings)
    expect(s.records[0]).toMatchObject({ kind: 'kg', value: 52.5, previous: 50 })
    expect(s.increased[0]).toMatchObject({ from: 50, to: 52.5 })
    expect(s.previous?.volume).toBe(800)
    expect(s.previous?.nowVolume).toBe(577.5)
  })

  it('detects a rep record at the same weight', () => {
    const a = wk('a', 1, 50, [6, 6])
    const b = wk('b', 3, 50, [7, 6])
    const s = summarize(b, [a, b], exercises, settings)
    expect(s.records[0].kind).not.toBe('kg')
    expect(s.increased).toHaveLength(0)
  })

  it('no records on the very first session, but flags ready for next time', () => {
    const a = wk('a', 1, 50, [8, 8])
    const s = summarize(a, [a], exercises, settings)
    expect(s.records).toHaveLength(0)
    expect(s.previous).toBeUndefined()
    expect(s.readyNext).toEqual(['bp'])
  })
})
