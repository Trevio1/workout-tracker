import raw from '../data/library.json'
import type { Category, Exercise } from '../types'
import { normalize } from './text'

export interface LibraryItem {
  id: string
  name: string
  category: Category
  muscle: string
  primary: string[]
  secondary: string[]
  level: string
  equipment: string
  steps: string[]
  tip: string
  aliases: string[]
  images: number
  seed?: string
  src?: string
}

interface RawItem extends Omit<LibraryItem, 'category'> {
  category: string
}

export const LIBRARY: LibraryItem[] = (raw as RawItem[]).map((x) => ({ ...x, category: x.category as Category }))
const BY_ID = new Map(LIBRARY.map((x) => [x.id, x]))

export function libraryItem(ex: Pick<Exercise, 'libId'> | undefined): LibraryItem | undefined {
  return ex?.libId ? BY_ID.get(ex.libId) : undefined
}

export function imageUrl(item: LibraryItem, index = 0): string | null {
  if (item.images <= index) return null
  return `${import.meta.env.BASE_URL}ex/${item.id}/${index}.jpg`
}

/** English source name, e.g. "Barbell Bench Press - Medium Grip", for search */
export function englishName(item: LibraryItem): string {
  return item.src ? item.src.replace(/_/g, ' ') : ''
}

export interface SyncPlan {
  link: { id: string; libId: string }[]
  add: Exercise[]
}

/**
 * Connects the user's exercises with the library without creating duplicates:
 * seed exercises and exercises with the same name or an alias get a libId,
 * library entries nobody covers yet are added.
 */
export function planLibrarySync(existing: Exercise[], lib: LibraryItem[] = LIBRARY): SyncPlan {
  const link: SyncPlan['link'] = []
  const add: Exercise[] = []
  const libIdOf = new Map(existing.map((e) => [e.id, e.libId]))
  const byName = new Map<string, Exercise[]>()
  for (const e of existing) {
    const k = normalize(e.name)
    byName.set(k, [...(byName.get(k) ?? []), e])
  }
  const covered = new Set(existing.map((e) => e.libId).filter((x): x is string => Boolean(x)))

  for (const item of lib) {
    const matches: Exercise[] = []
    if (item.seed) {
      const s = existing.find((e) => e.id === item.seed)
      if (s) matches.push(s)
    }
    for (const n of [item.name, ...item.aliases]) matches.push(...(byName.get(normalize(n)) ?? []))
    for (const m of matches) {
      if (!libIdOf.get(m.id)) {
        link.push({ id: m.id, libId: item.id })
        libIdOf.set(m.id, item.id)
        covered.add(item.id)
      } else if (libIdOf.get(m.id) === item.id) {
        covered.add(item.id)
      }
    }
    if (!covered.has(item.id) && !existing.some((e) => e.id === item.id)) {
      add.push({ id: item.id, name: item.name, category: item.category, muscle: item.muscle, libId: item.id })
      covered.add(item.id)
    }
  }
  return { link, add }
}
