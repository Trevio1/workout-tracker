import type { ReactNode } from 'react'

interface Props {
  z: number
  title?: ReactNode
  left?: ReactNode
  right?: ReactNode
  onBackdrop?: () => void
  bodyClass?: string
  children: ReactNode
  footer?: ReactNode
  bodyRef?: React.Ref<HTMLDivElement>
}

export function Sheet({ z, title, left, right, onBackdrop, bodyClass, children, footer, bodyRef }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: z }}>
      <div className="sheet-backdrop" onClick={onBackdrop} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="side">{left}</div>
          <div className="title">{title}</div>
          <div className="side right">{right}</div>
        </div>
        <div className={`sheet-body ${bodyClass ?? ''}`} ref={bodyRef}>
          {children}
        </div>
        {footer}
      </div>
    </div>
  )
}
