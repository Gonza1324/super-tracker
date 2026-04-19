import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { currentGroupId } = useCurrentGroup()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />
  if (!currentGroupId) return <Navigate to="/groups" replace />

  return <Outlet />
}

export function AuthRoute() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/groups" replace />

  return <Outlet />
}

export function GroupsRoute() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
