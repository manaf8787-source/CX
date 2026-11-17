import type { ReactNode } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import { ENTER } from '@/lib/motion'

const loadFeatures = () => import('@/lib/motionFeatures').then((m) => m.default)

/** `reducedMotion="user"` turns transform animations off when the OS asks for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={ENTER}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
