const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  return nf.format(n)
}

export function fmtSet(kg: number | null, reps: number | null, unit = 'kg'): string {
  if (kg === null && reps === null) return '—'
  if (kg === null || kg === 0) return `${fmtNum(reps)} Wdh.`
  return `${fmtNum(kg)} ${unit} × ${fmtNum(reps)}`
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} Min.`
  const rest = min % 60
  return rest === 0 ? `${Math.floor(min / 60)} Std.` : `${Math.floor(min / 60)} Std. ${rest} Min.`
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
const dayFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })
const shortFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })

export const fmtDate = (t: number) => dateFmt.format(t)
export const fmtDay = (t: number) => dayFmt.format(t)
export const fmtMonth = (t: number) => monthFmt.format(t)
export const fmtTime = (t: number) => timeFmt.format(t)
export const fmtShort = (t: number) => shortFmt.format(t)

export function parseNum(s: string): number | null {
  const t = s.replace(',', '.').trim()
  if (t === '' || t === '.') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** "heute", "gestern", "vor 3 Tagen" */
export function relativeDay(t: number, now = Date.now()): string {
  const day = (x: number) => {
    const d = new Date(x)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const diff = Math.round((day(now) - day(t)) / 86400000)
  if (diff <= 0) return 'heute'
  if (diff === 1) return 'gestern'
  if (diff < 14) return `vor ${diff} Tagen`
  return `am ${fmtDate(t)}`
}
