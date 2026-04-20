import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/app/router'
import { supabase } from '@/lib/supabase'
import { useGroupStore } from '@/stores/groupStore'
import './index.css'

const LAST_USER_KEY = 'super-tracker-last-user'

function resetClientState() {
  useGroupStore.getState().clearCurrentGroup()
  queryClient.clear()
}

const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
  const newUserId = session?.user.id ?? null
  const lastUserId = localStorage.getItem(LAST_USER_KEY)

  if (event === 'SIGNED_OUT') {
    resetClientState()
    localStorage.removeItem(LAST_USER_KEY)
    return
  }

  if (newUserId && newUserId !== lastUserId) {
    if (lastUserId !== null) resetClientState()
    localStorage.setItem(LAST_USER_KEY, newUserId)
  }
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => authSubscription.subscription.unsubscribe())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
