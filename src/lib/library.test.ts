import { describe, expect, it } from 'vitest'
import { LIBRARY, planLibrarySync, type LibraryItem } from './library'
import { SEED_EXERCISES } from '../seed'
import type { Exercise } from '../types'

const item = (over: Partial<LibraryItem>): LibraryItem => ({
  id: 'lib-x', name: 'X', category: 'machine', muscle: 'Beine', primary: [], secondary: [], level: '',
  equipment: '', steps: ['a', 'b'], tip: 't', aliases: [], images: 2, ...over,
})

describe('planLibrarySync', () => {
  it('links seed exercises instead of adding duplicates', () => {
    const lib = [item({ id: 'lib-leg-press', name: 'Beinpresse', seed: 'ex-beinpresse' })]
    const existing: Exercise[] = [{ id: 'ex-beinpresse', name: 'Beinpresse', category: 'machine', muscle: 'Beine' }]
    const p = planLibrarySync(existing, lib)
    expect(p.link).toEqual([{ id: 'ex-beinpresse', libId: 'lib-leg-press' }])
    expect(p.add).toHaveLength(0)
  })

  it('links custom exercises by name or alias, case and umlauts ignored', () => {
    const lib = [item({ id: 'lib-hack', name: 'Hackenschmidt', aliases: ['Hack Squat'] }), item({ id: 'lib-lat1', name: 'Latzug einarmig', aliases: ['Latzug, einarmig'] })]
    const existing: Exercise[] = [
      { id: 'c1', name: 'hackenschmidt', category: 'machine', muscle: 'Beine', custom: true },
      { id: 'c2', name: 'Latzug, einarmig', category: 'cable', muscle: 'Rücken', custom: true },
    ]
    const p = planLibrarySync(existing, lib)
    expect(p.link.map((l) => l.id).sort()).toEqual(['c1', 'c2'])
    expect(p.add).toHaveLength(0)
  })

  it('adds uncovered library entries once and is idempotent', () => {
    const lib = [item({ id: 'lib-new', name: 'Neue Übung' })]
    const first = planLibrarySync([], lib)
    expect(first.add.map((a) => a.id)).toEqual(['lib-new'])
    const second = planLibrarySync(first.add, lib)
    expect(second.add).toHaveLength(0)
    expect(second.link).toHaveLength(0)
  })

  it('real library covers every seed exercise and has no duplicate names', () => {
    const p = planLibrarySync(SEED_EXERCISES)
    expect(p.link).toHaveLength(SEED_EXERCISES.length)
    const names = LIBRARY.map((x) => x.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    expect(LIBRARY.length).toBeGreaterThan(300)
  })
})
