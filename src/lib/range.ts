/** Reads a rep range like "5–8 Wdh." or "6-10 Wdh" from a note */
export function rangeFromNote(note: string | undefined): { repMin: number; repMax: number } | null {
  if (!note) return null
  const m = note.match(/(\d+)\s*[–\-—]\s*(\d+)\s*(?:Wdh|Wiederholungen|reps)/i)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  if (!a || !b || a > b || b > 100) return null
  return { repMin: a, repMax: b }
}
