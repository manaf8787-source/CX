import { useNavigate } from 'react-router-dom'
import { usePersons } from '@/services/queries'
import { useAssistant } from '@/components/ai/AssistantContext'

/** A request in words, not a key: three or more words, or a question mark. */
function looksLikeQuestion(q: string) {
  return /[?؟]/.test(q) || q.split(/\s+/).filter(Boolean).length >= 3
}

/** KB §3: a name, mobile, ID or unit opens the person; a question in your own
 * words goes to the assistant (for roles that have it). Anything else lands on
 * the Customers list filtered by the text. Shared by the header and Home. */
export function usePersonSearch() {
  const navigate = useNavigate()
  const assistant = useAssistant()
  const { data: persons } = usePersons()

  return (query: string) => {
    const text = query.trim()
    const needle = text.toLowerCase()
    if (!needle) return
    const match = persons?.find(
      (p) =>
        p.name.toLowerCase() === needle ||
        (!looksLikeQuestion(text) && p.name.toLowerCase().includes(needle)) ||
        p.identity.mobile?.includes(needle) ||
        p.identity.emiratesId?.toLowerCase() === needle ||
        p.identity.crmContactId?.toLowerCase() === needle ||
        p.id === needle,
    )
    if (match) navigate(`/customers/${match.id}`)
    else if (assistant.available && looksLikeQuestion(text)) assistant.open(text)
    else navigate(`/customers?q=${encodeURIComponent(text)}`)
  }
}
