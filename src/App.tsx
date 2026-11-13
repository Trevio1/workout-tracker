import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, type IconName } from './components/Icon'
import { DialogProvider, useDialogs } from './components/Dialogs'
import { NavProvider, useNav, type Route } from './nav'
import { db } from './db'
import { useNow } from './hooks'
import { beep } from './lib/sound'
import { fmtClock } from './lib/format'
import { Home } from './screens/Home'
import { History } from './screens/History'
import { Exercises } from './screens/Exercises'
import { Settings } from './screens/Settings'
import { Stats } from './screens/Stats'
import { ActiveWorkout } from './screens/ActiveWorkout'
import { RoutineEditor } from './screens/RoutineEditor'
import { RoutinePreview } from './screens/RoutinePreview'
import { WorkoutDetail } from './screens/WorkoutDetail'
import { ExerciseDetail } from './screens/ExerciseDetail'
import { ImportPlan } from './screens/ImportPlan'
import { WorkoutSummary } from './screens/WorkoutSummary'

type Tab = 'home' | 'history' | 'stats' | 'exercises' | 'settings'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Training', icon: 'dumbbell' },
  { id: 'history', label: 'Verlauf', icon: 'history' },
  { id: 'stats', label: 'Statistik', icon: 'chart' },
  { id: 'exercises', label: 'Übungen', icon: 'list' },
  { id: 'settings', label: 'Einstellungen', icon: 'settings' },
]

function RouteView({ route, z }: { route: Route; z: number }) {
  switch (route.type) {
    case 'routine-edit':
      return <RoutineEditor id={route.id} z={z} />
    case 'routine-preview':
      return <RoutinePreview id={route.id} z={z} />
    case 'workout-detail':
      return <WorkoutDetail id={route.id} z={z} />
    case 'exercise-detail':
      return <ExerciseDetail id={route.id} z={z} />
    case 'plan-import':
      return <ImportPlan z={z} />
    case 'workout-summary':
      return <WorkoutSummary id={route.id} z={z} />
  }
}

function Shell() {
  const nav = useNav()
  const dialogs = useDialogs()
  const [tab, setTab] = useState<Tab>('home')
  const active = useLiveQuery(() => db.active.get('active'), [])
  const now = useNow(500, Boolean(active))
  const beeped = useRef<number | null>(null)

  // Rest timer end: beep once, even when the workout sheet is minimized
  useEffect(() => {
    const rest = active?.rest
    if (!rest || rest.endsAt > now || beeped.current === rest.endsAt) return
    beeped.current = rest.endsAt
    if (now - rest.endsAt < 5000) {
      beep()
      dialogs.toast('Pause vorbei')
    }
    void db.active.update('active', { rest: undefined })
  }, [active, now, dialogs])

  useEffect(() => {
    void navigator.storage?.persist?.()
  }, [])

  const anySheet = nav.stack.length > 0 || (nav.activeOpen && Boolean(active))
  useEffect(() => {
    document.body.style.overflow = anySheet ? 'hidden' : ''
  }, [anySheet])

  return (
    <>
      {tab === 'home' && <Home />}
      {tab === 'history' && <History />}
      {tab === 'stats' && <Stats />}
      {tab === 'exercises' && <Exercises />}
      {tab === 'settings' && <Settings />}

      {active && !nav.activeOpen && (
        <button className="mini-workout" onClick={() => nav.setActiveOpen(true)}>
          <span className="dot" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active.name}
            </b>
            <span className="muted small">
              {fmtClock((now - active.start) / 1000)}
              {active.rest && active.rest.endsAt > now
                ? ` · Pause ${fmtClock(Math.ceil((active.rest.endsAt - now) / 1000))}`
                : ''}
            </span>
          </span>
          <span className="link">Öffnen</span>
        </button>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={24} />
            {t.label}
          </button>
        ))}
      </nav>

      {active && nav.activeOpen && <ActiveWorkout key={active.start} initial={active} z={30} />}
      {nav.stack.map((r, i) => (
        <RouteView key={i + r.type} route={r} z={40 + i * 10} />
      ))}
    </>
  )
}

export default function App() {
  return (
    <DialogProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </DialogProvider>
  )
}
