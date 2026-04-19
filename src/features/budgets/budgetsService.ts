import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Budget = Tables<'budgets'>

export async function fetchBudget(groupId: string, month: string): Promise<Budget | null> {
  const { data, error } = await supabase
    .from('budgets')
    .select()
    .eq('group_id', groupId)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertBudget(
  groupId: string,
  month: string,
  amount: number,
  alertThreshold: number
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { group_id: groupId, month, amount, alert_threshold: alertThreshold },
      { onConflict: 'group_id,month' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}
