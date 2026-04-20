import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type GroupWithRole = Tables<'groups'> & { role: 'owner' | 'member' }

export async function fetchUserGroups(): Promise<GroupWithRole[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups(id, name, created_by, created_at)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  return (data ?? [])
    .filter(row => row.groups !== null)
    .map(row => ({
      ...(row.groups as Tables<'groups'>),
      role: row.role as 'owner' | 'member',
    }))
}

export async function createGroup(name: string): Promise<Tables<'groups'>> {
  const { data, error } = await supabase.rpc('create_group', { group_name: name })
  if (error) throw error
  return data as Tables<'groups'>
}

export async function joinGroup(groupId: string): Promise<Tables<'groups'>> {
  const { data, error } = await supabase.rpc('join_group', { p_group_id: groupId })
  if (error) {
    if (error.code === '23505') throw new Error('Ya sos miembro de ese grupo.')
    if (error.message?.includes('group_not_found')) throw new Error('Grupo no encontrado. Verificá el código.')
    throw error
  }
  return data as Tables<'groups'>
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId })
  if (error) {
    if (error.message?.includes('last_owner')) {
      throw new Error('Sos el único dueño. Eliminá el grupo o transferí la propiedad antes de salir.')
    }
    if (error.message?.includes('not_member')) throw new Error('No sos miembro de ese grupo.')
    throw error
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_group', { p_group_id: groupId })
  if (error) {
    if (error.message?.includes('not_owner')) throw new Error('Solo el dueño puede eliminar el grupo.')
    throw error
  }
}
