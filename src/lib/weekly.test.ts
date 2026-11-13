import { describe, expect, it } from 'vitest'
import { addWeeks, startOfWeek, weekStreak } from './weekly'
import type { Workout } from '../types'

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 18).getTime()
const w = (t: number): Workout => ({ id: String(t), name: 'X', start: t, end: t + 1, exercises: [] })

describe('weekly', () => {
  it('weeks start on Monday', () => {
    // Fri 13 Nov 2026 -> Mon 9 Nov 2026
    expect(new Date(startOfWeek(at(2026, 11, 13))).getDate()).toBe(9)
    expect(new Date(startOfWeek(at(2026, 11, 15))).getDate()).toBe(9) // Sunday
    expect(new Date(addWeeks(startOfWeek(at(2026, 11, 13)), -1)).getDate()).toBe(2)
  })

  it('counts weeks in a row, the running week only once trained', () => {
    const now = at(2026, 11, 10) // Tue, nothing yet this week
    const list = [w(at(2026, 11, 3)), w(at(2026, 10, 28)), w(at(2026, 10, 20))]
    expect(weekStreak(list, now)).toBe(3)
    expect(weekStreak([...list, w(at(2026, 11, 9))], now)).toBe(4)
    expect(weekStreak([w(at(2026, 10, 20))], now)).toBe(0)
  })
})
