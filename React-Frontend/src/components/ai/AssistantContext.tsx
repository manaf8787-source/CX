import { createContext, useContext } from 'react'

export interface AssistantControls {
  /** False for roles without the assistant (KB §13). */
  available: boolean
  /** Opens the assistant; a question is asked straight away. */
  open: (question?: string) => void
}

export const AssistantContext = createContext<AssistantControls>({ available: false, open: () => {} })

export function useAssistant(): AssistantControls {
  return useContext(AssistantContext)
}
