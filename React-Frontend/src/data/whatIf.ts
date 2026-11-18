import type { Bi } from '../types'
import type { WhatIfRuleKey } from '../utils/patterns'

const b = (en: string, ar: string): Bi => ({ en, ar })

/** "What if" candidate values per threshold (v40 F32). They are the prototype's samples: change them here. The concentration threshold is not included. */
export const WHAT_IF_CANDIDATES: Record<WhatIfRuleKey, readonly number[]> = {
  sameIssueMin: [3, 4, 5, 6, 8],
  sameAgentMin: [2, 3, 4, 5],
  windowDays: [14, 30, 45, 60],
}

/** Signals "Rules" pointer and "What if" card copy (v40 S16). */
export const RULES_POINTER_COPY = {
  pointerTitle: b('One place for every threshold.', 'مكان واحد لكل عتبة.'),
  pointerText: b(
    'These are the same numbers as Settings → Rules as configuration; change them there and every page recomputes.',
    'هذه الأرقام نفسها في الإعدادات ← القواعد كإعدادات؛ غيّرها هناك وتُعاد حسابات كل الصفحات.',
  ),
  open: b('Open', 'افتح'),
  whatIfTitle: b('What if', 'ماذا لو'),
  whatIfHint: (n: number): Bi =>
    b(
      `With today's thresholds there are ${n} patterns. Each cell shows how many there would be with that one value changed; the bold one is the current setting. Change it under Settings.`,
      `بعتبات اليوم يوجد ${n} أنماط. كل خلية تُظهر كم سيكون العدد لو تغيرت هذه القيمة وحدها؛ الغامق هو الإعداد الحالي. غيّرها في الإعدادات.`,
    ),
  tableHeading: b('Threshold', 'العتبة'),
  rows: {
    sameIssueMin: b('Same issue, times', 'نفس المشكلة، مرات'),
    sameAgentMin: b('Same agent, times', 'نفس الموظف، مرات'),
    windowDays: b('Window (days)', 'النافذة (أيام)'),
  } satisfies Record<WhatIfRuleKey, Bi>,
  cell: (value: number, n: number): Bi => b(`${value} → ${n} patterns`, `${value} → ${n} أنماط`),
}
