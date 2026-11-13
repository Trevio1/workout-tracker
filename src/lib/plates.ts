export interface PlateResult {
  perSide: number[]
  achieved: number
  exact: boolean
}

/** Greedy plate split per side for a target total weight */
export function platesFor(target: number, barKg: number, plates: number[]): PlateResult {
  const sorted = [...plates].sort((a, b) => b - a)
  let remaining = Math.max(0, (target - barKg) / 2)
  const perSide: number[] = []
  for (const p of sorted) {
    while (remaining + 1e-9 >= p) {
      perSide.push(p)
      remaining -= p
    }
  }
  const achieved = barKg + perSide.reduce((s, p) => s + p, 0) * 2
  return { perSide, achieved, exact: Math.abs(achieved - target) < 1e-6 }
}

export const PLATE_COLOR: Record<string, string> = {
  '25': '#d9433b',
  '20': '#2f6fd6',
  '15': '#e8b923',
  '10': '#3c9a4b',
  '5': '#f2f2f2',
  '2.5': '#4a4a4f',
  '1.25': '#9a9aa0',
}
