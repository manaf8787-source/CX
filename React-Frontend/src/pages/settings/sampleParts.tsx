import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FOLD_KEY = 'psicx.sample.folded'

function readFolded(key: string): boolean {
  try {
    return !!(JSON.parse(localStorage.getItem(FOLD_KEY) ?? '{}') as Record<string, boolean>)[key]
  } catch {
    return false
  }
}

function writeFolded(key: string, folded: boolean) {
  try {
    const all = JSON.parse(localStorage.getItem(FOLD_KEY) ?? '{}') as Record<string, boolean>
    localStorage.setItem(FOLD_KEY, JSON.stringify({ ...all, [key]: folded }))
  } catch {
    /* no storage: the note simply opens again next time */
  }
}

/**
 * The note above the cards and the table: an inline notification well (6px dot, title, grey text) whose title is the button that folds it.
 * Open on the first visit, so the "what this is" text is always read once; a reader who has read it folds it, and the choice is remembered in
 * this browser (a per-viewer convenience, never needed: without storage it opens each visit). On a phone the two notes would otherwise fill the
 * first screen before the first card.
 */
export function FoldNote({ id, title, children, 'data-testid': testId }: { id: string; title: ReactNode; children: ReactNode; 'data-testid'?: string }) {
  const [folded, setFolded] = useState(() => readFolded(id))
  const bodyId = useId()
  return (
    <div data-slot="inline-note" data-testid={testId} className="well flex items-start gap-3 px-4 py-3.5">
      <span aria-hidden className="dot dot-info mt-[7px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="t-small-strong">
          <button
            type="button"
            aria-expanded={!folded}
            aria-controls={bodyId}
            onClick={() => {
              writeFolded(id, !folded)
              setFolded(!folded)
            }}
            className="-my-1 flex w-full cursor-pointer items-center justify-between gap-3 rounded-md py-1 text-start outline-hidden"
          >
            <span>{title}</span>
            <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-400 ease-spring', !folded && 'rotate-180')} />
          </button>
        </h2>
        <p id={bodyId} hidden={folded} className="max-w-[80ch] text-sm text-muted-foreground">
          {children}
        </p>
      </div>
    </div>
  )
}
