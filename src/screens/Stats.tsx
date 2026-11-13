import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { db } from '../db'
import { useExercises } from '../hooks'
import { fmtNum } from '../lib/format'
import { workoutVolume } from '../lib/stats'
import {
  addWeeks,
  calendarGrid,
  dayKey,
  inWeek,
  monthStats,
  setsByMuscle,
  startOfWeek,
  weekStreak,
} from '../lib/weekly'

const rangeFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const BAND_MIN = 10
const BAND_MAX = 20

export function Stats() {
  const exercises = useExercises()
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const [offset, setOffset] = useState(0)

  const thisWeek = startOfWeek(Date.now())
  const weekStart = addWeeks(thisWeek, offset)
  const data = useMemo(() => {
    const all = workouts ?? []
    const week = inWeek(all, weekStart)
    const days = new Set(all.map((w) => dayKey(w.start)))
    return {
      week,
      muscles: setsByMuscle(week, exercises),
      sets: week.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.filter((s) => !s.warmup).length, 0), 0),
      volume: week.reduce((s, w) => s + workoutVolume(w), 0),
      days,
      streak: weekStreak(all),
      month: monthStats(all, 0),
      lastMonth: monthStats(all, -1),
      total: all.length,
    }
  }, [workouts, exercises, weekStart])

  const weekLabel =
    offset === 0
      ? 'Diese Woche'
      : offset === -1
        ? 'Letzte Woche'
        : `${rangeFmt.format(weekStart)} – ${rangeFmt.format(addWeeks(weekStart, 1) - 1)}`
  const scaleMax = Math.max(BAND_MAX + 4, ...data.muscles.map((m) => m.sets))
  const pct = (n: number) => `${(n / scaleMax) * 100}%`
  const grid = calendarGrid(12)
  const todayKey = dayKey(Date.now())
  const monthDelta = data.lastMonth.workouts ? data.month.workouts - data.lastMonth.workouts : null

  if (workouts && workouts.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen-title">Statistik</h1>
        <div className="empty">Nach deinem ersten Workout siehst du hier deinen Wochenumfang, den Kalender und deine Serie.</div>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Statistik</h1>

      <div className="stat-grid">
        <div className="stat">
          <div className="v">{data.streak}</div>
          <div className="k">{data.streak === 1 ? 'Woche' : 'Wochen'} am Stück</div>
        </div>
        <div className="stat">
          <div className="v">{data.month.workouts}</div>
          <div className="k">
            Workouts diesen Monat
            {monthDelta !== null && (
              <span className={`delta ${monthDelta >= 0 ? 'up' : 'down'}`}>
                {' '}
                ({monthDelta >= 0 ? '+' : '−'}
                {Math.abs(monthDelta)})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="week-switch">
        <button className="icon-btn grey" onClick={() => setOffset((o) => o - 1)} aria-label="Woche zurück">
          <Icon name="back" size={18} />
        </button>
        <div className="week-title">
          <b>{weekLabel}</b>
          <span className="muted small">
            {data.week.length} {data.week.length === 1 ? 'Workout' : 'Workouts'} · {data.sets} Sätze ·{' '}
            {fmtNum(Math.round(data.volume))} kg
          </span>
        </div>
        <button
          className="icon-btn grey"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset === 0}
          aria-label="Woche vor"
        >
          <span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
            <Icon name="back" size={18} />
          </span>
        </button>
      </div>

      <div className="section-head" style={{ marginTop: 14 }}>
        <h3>Sätze pro Muskel</h3>
        <span className="muted small">Richtwert {BAND_MIN}–{BAND_MAX}</span>
      </div>
      {data.muscles.length === 0 ? (
        <div className="empty">In dieser Woche noch keine Sätze.</div>
      ) : (
        <div className="muscle-list">
          {data.muscles.map((m) => {
            const zone = m.sets < BAND_MIN ? 'low' : m.sets > BAND_MAX ? 'high' : 'ok'
            return (
              <div className="muscle-row" key={m.muscle}>
                <span className="muscle-name">{m.muscle}</span>
                <div className="muscle-track">
                  <div className="muscle-band" style={{ left: pct(BAND_MIN), width: pct(BAND_MAX - BAND_MIN) }} />
                  <div className={`muscle-bar ${zone}`} style={{ width: pct(m.sets) }} />
                </div>
                <span className="muscle-val">{m.sets}</span>
              </div>
            )
          })}
        </div>
      )}
      <p className="group-foot">
        Gezählt werden abgehakte Arbeitssätze, nur für den Hauptmuskel der Übung. Bankdrücken zählt also für die Brust,
        nicht zusätzlich für den Trizeps. Der Richtbereich ist ein grober Anhaltspunkt, kein Muss.
      </p>

      <div className="section-head">
        <h3>Letzte 12 Wochen</h3>
        <span className="muted small">{data.total} Workouts gesamt</span>
      </div>
      <div className="cal">
        <div className="cal-days">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {grid.map((week, wi) => (
            <div className="cal-col" key={wi}>
              {week.map((day) => {
                const k = dayKey(day)
                const future = day > Date.now()
                return (
                  <span
                    key={k}
                    className={`cal-cell${data.days.has(k) ? ' on' : ''}${k === todayKey ? ' today' : ''}${future ? ' future' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
