import { useEffect, useState } from 'react'
import { imageUrl, type LibraryItem } from '../lib/library'

/** Photos (start/end, alternating like a mini animation) and step-by-step instructions */
export function HowTo({ item }: { item: LibraryItem }) {
  const [frame, setFrame] = useState(0)
  const [paused, setPaused] = useState(false)
  const imgs = [imageUrl(item, 0), imageUrl(item, 1)].filter((x): x is string => Boolean(x))

  useEffect(() => {
    if (imgs.length < 2 || paused) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = window.setInterval(() => setFrame((f) => (f + 1) % 2), 1300)
    return () => window.clearInterval(t)
  }, [imgs.length, paused])

  return (
    <>
      {imgs.length > 0 && (
        <button
          className="howto-media"
          style={{ display: 'block', width: 'calc(100% + 32px)' }}
          onClick={() => {
            setPaused(true)
            setFrame((f) => (f + 1) % imgs.length)
          }}
          aria-label="Bild wechseln"
        >
          {imgs.map((src, i) => (
            <img key={src} src={src} alt={`${item.name}, ${i === 0 ? 'Startposition' : 'Endposition'}`} style={{ opacity: frame === i ? 1 : 0 }} />
          ))}
          {imgs.length > 1 && (
            <>
              <span className="howto-badge">{frame === 0 ? 'Start' : 'Ende'}</span>
              <span className="howto-dots">
                <span className={frame === 0 ? 'on' : ''} />
                <span className={frame === 1 ? 'on' : ''} />
              </span>
            </>
          )}
        </button>
      )}

      <div className="section-head" style={{ marginTop: imgs.length ? 4 : 10 }}>
        <h3>Anleitung</h3>
        <span className="muted small">{[item.equipment, item.level].filter(Boolean).join(' · ')}</span>
      </div>
      <ol className="howto-steps">
        {item.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="howto-tip">
        <span>
          <b>Tipp:</b> {item.tip}
        </span>
      </div>
      {(item.primary.length > 0 || item.secondary.length > 0) && (
        <div style={{ marginTop: 14 }}>
          <span className="muted small">Muskeln</span>
          <div className="muscle-chips">
            {item.primary.map((m) => (
              <span key={m} className="muscle-chip primary">
                {m}
              </span>
            ))}
            {item.secondary.map((m) => (
              <span key={m} className="muscle-chip">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
