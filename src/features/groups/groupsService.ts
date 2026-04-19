import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type GroupWithRole = Tables<'groups'> & { role: 'owner' | 'member' }

export async function fetchUserGroups(): Promise<GroupWithRole[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups(id, name, created_by, created_at)')
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, created_by: user.id })
    .select()
    .single()

  if (groupError) throw groupError

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id, role: 'owner' })

  if (memberError) throw memberError

  return group
}

export async function joinGroup(groupId: string): Promise<Tables<'groups'>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select()
    .eq('id', groupId)
    .single()

  if (groupError || !group) throw new Error('Grupo no encontrado. Verificá el código.')

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: user.id, role: 'member' })

  if (memberError) {
    if (memberError.code === '23505') throw new Error('Ya sos miembro de ese grupo.')
    throw memberError
  }

  return group
}
