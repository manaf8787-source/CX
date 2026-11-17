import { useNavigate } from 'react-router-dom'
import { usePersons } from '@/services/queries'

/** FR-1.1: a name, mobile or ID opens that person; anything else lands on the
 * Customers list filtered by the text. Shared by the header and Home search boxes. */
export function usePersonSearch() {
  const navigate = useNavigate()
  const { data: persons } = usePersons()

  return (query: string) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return
    const match = persons?.find((p) => p.name.toLowerCase().includes(needle) || p.identity.mobile?.includes(needle))
    if (match) navigate(`/customers/${match.id}`)
    else navigate(`/customers?q=${encodeURIComponent(query.trim())}`)
  }
}
