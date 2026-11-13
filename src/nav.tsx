import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Route =
  | { type: 'routine-edit'; id?: string }
  | { type: 'routine-preview'; id: string }
  | { type: 'workout-detail'; id: string }
  | { type: 'exercise-detail'; id: string }

interface NavApi {
  stack: Route[]
  push: (r: Route) => void
  pop: () => void
  activeOpen: boolean
  setActiveOpen: (v: boolean) => void
}

const Ctx = createContext<NavApi | null>(null)

export function useNav(): NavApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('NavProvider missing')
  return v
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([])
  const [activeOpen, setActiveOpen] = useState(false)
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const value = useMemo(
    () => ({ stack, push, pop, activeOpen, setActiveOpen }),
    [stack, push, pop, activeOpen],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
