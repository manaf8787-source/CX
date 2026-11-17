import { startTransition, useEffect, useState, type ReactNode } from 'react'

/**
 * Mounts `children` in a transition after the first paint. Heavy subtrees such as
 * charts then render in interruptible, time-sliced chunks instead of one long task,
 * so the page responds sooner. The parent must reserve the space (fixed height).
 */
export function DeferredRender({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    startTransition(() => setReady(true))
  }, [])
  return ready ? children : fallback
}
