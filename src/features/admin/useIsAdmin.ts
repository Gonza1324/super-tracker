import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (error) return false
      return data?.is_admin ?? false
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  return { isAdmin: data ?? false, loading: authLoading || (!!user && isLoading) }
}
