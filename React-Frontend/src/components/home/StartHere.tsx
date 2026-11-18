import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Bi } from '@/types'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** "New here? Three things to know" (v40 S1, verbatim). */
const START_HERE_COPY = {
  summary: b('New here? Three things to know', 'جديد هنا؟ ثلاثة أشياء تعرفها'),
  items: [
    b(
      'The portal does one thing: it turns what customers tell us into fixes, and checks the fixes worked. The six steps at the top are that one thing. Click any step to go there.',
      'البورتال يفعل شيئاً واحداً: يحوّل ما يقوله الزبائن إلى حلول ويتأكد أنها نفعت. الخطوات الست في الأعلى هي ذلك الشيء. اضغط أي خطوة لتذهب إليها.',
    ),
    b(
      'Three numbers say how customers feel: NPS (would they recommend us), CSAT (were they happy with the last step), CES (was it easy). Each product has its own; nothing is averaged across products. The "?" beside each one explains it.',
      'ثلاثة أرقام تقول كيف يشعر الزبائن: NPS (هل يوصون بنا)، CSAT (هل رضوا عن آخر خطوة)، CES (هل كانت سهلة). لكل منتج أرقامه؛ لا يُجمع شيء بين المنتجات. علامة "?" بجانب كل رقم تشرحه.',
    ),
    b(
      'Every record shows where it is on the six steps and what happens next, with who and by when. You never have to guess.',
      'كل سجل يُظهر أين هو على الخطوات الست وما الذي يحدث بعدها، مع من ومتى. لا تحتاج أن تخمّن.',
    ),
  ],
}

const STORAGE_KEY = 'psicx.home.startHere'

/** Open by default, as in the prototype. The collapsed state is remembered per browser ([Proposed]); storage may be blocked, so every access is guarded. */
function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'closed'
  } catch {
    return true
  }
}

function writeOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, open ? 'open' : 'closed')
  } catch {
    /* storage blocked: the card still works, it just forgets */
  }
}

export function StartHere({ className }: { className?: string }) {
  const { L } = useI18n()
  const [open, setOpen] = useState(readOpen)

  return (
    <Card className={cn('gap-0 py-0', className)}>
      <Collapsible
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          writeOpen(next)
        }}
      >
        <CollapsibleTrigger className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-5 py-3 text-start text-base font-semibold outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {L(START_HERE_COPY.summary)}
          <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="grid grid-cols-1 gap-4 px-5 pt-1 pb-5 md:grid-cols-3">
            {START_HERE_COPY.items.map((item, i) => (
              <li key={i} className="flex min-w-0 items-start gap-3 text-sm">
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{L(item)}</span>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
