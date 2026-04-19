import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database'

export type Store = Tables<'stores'>

export async function fetchStores(groupId: string): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select()
    .eq('group_id', groupId)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createStore(
  groupId: string,
  name: string,
  type: TablesInsert<'stores'>['type'] = 'supermercado'
): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .insert({ group_id: groupId, name, type })
    .select()
    .single()
  if (error) throw error
  return data
}
