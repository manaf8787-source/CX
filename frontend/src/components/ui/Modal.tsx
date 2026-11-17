import type { ReactNode } from 'react'

export function Modal({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-h">
          <h2>{title}</h2>
          <button className="btn s" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
