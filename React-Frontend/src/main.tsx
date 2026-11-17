import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query'
import './index.css'
import App from './App'

// Arriving data re-renders pages in an interruptible, time-sliced transition rather
// than one long task, which keeps the page responsive while it fills in.
notifyManager.setBatchNotifyFunction((callback) => startTransition(callback))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
