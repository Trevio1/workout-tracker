import { db } from '../db'
import { planLibrarySync } from './library'

/** Runs on every start; cheap and only writes when the library brought something new */
export async function syncLibrary(): Promise<{ linked: number; added: number }> {
  return db.transaction('rw', db.exercises, async () => {
    const plan = planLibrarySync(await db.exercises.toArray())
    for (const l of plan.link) await db.exercises.update(l.id, { libId: l.libId })
    if (plan.add.length) await db.exercises.bulkAdd(plan.add)
    return { linked: plan.link.length, added: plan.add.length }
  })
}
