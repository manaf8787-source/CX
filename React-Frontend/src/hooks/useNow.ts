import { useState } from 'react'

/** `Date.now()` is impure to call during render (React Compiler flags it —
 * see `AssistantPanel`'s `voiceSupported` for the same lazy-initializer
 * pattern applied to `window.SpeechRecognition` detection). A lazy
 * `useState` initializer runs once at mount, which is enough for this
 * mock app's due-date clocks. */
export function useNow(): number {
  const [now] = useState(() => Date.now())
  return now
}
