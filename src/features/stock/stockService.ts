import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type StockItem = Tables<'stock_items'>

export type StockItemWithProduct = StockItem & {
  products: Pick<Tables<'products'>, 'id' | 'name' | 'brand' | 'category_id'> & {
    categories: Pick<Tables<'categories'>, 'id' | 'name' | 'icon'> | null
  } | null
}

export async function fetchStockItems(groupId: string): Promise<StockItemWithProduct[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*, products(id, name, brand, category_id, categories(id, name, icon))')
    .eq('group_id', groupId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as StockItemWithProduct[]
}

export type AdjustType = 'manual_add' | 'manual_remove'

export async function adjustStock(
  groupId: string,
  productId: string,
  stockItemId: string,
  currentQty: number,
  delta: number,
  unit: string,
  type: AdjustType,
  notes?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  const newQty = Math.max(0, currentQty + delta)
  const actualDelta = newQty - currentQty

  if (actualDelta === 0) return

  const { error: stockError } = await supabase
    .from('stock_items')
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', stockItemId)

  if (stockError) throw stockError

  const { error: movError } = await supabase
    .from('stock_movements')
    .insert({
      group_id: groupId,
      product_id: productId,
      type,
      quantity_delta: actualDelta,
      unit,
      notes: notes ?? null,
      created_by: user?.id ?? null,
    })

  if (movError) throw movError
}

export async function setMinQuantity(stockItemId: string, minQty: number): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .update({ min_quantity: minQty })
    .eq('id', stockItemId)
  if (error) throw error
}

export async function addStockManual(
  groupId: string,
  productId: string,
  delta: number,
  unit: string,
  notes?: string | null
): Promise<void> {
  if (delta <= 0) return

  const { data: { user } } = await supabase.auth.getUser()

  const { data: existing, error: fetchError } = await supabase
    .from('stock_items')
    .select('id, quantity')
    .eq('group_id', groupId)
    .eq('product_id', productId)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    const { error } = await supabase
      .from('stock_items')
      .update({ quantity: existing.quantity + delta, unit, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('stock_items')
      .insert({ group_id: groupId, product_id: productId, quantity: delta, unit })
    if (error) throw error
  }

  const { error: movError } = await supabase
    .from('stock_movements')
    .insert({
      group_id: groupId,
      product_id: productId,
      type: 'manual_add',
      quantity_delta: delta,
      unit,
      notes: notes ?? null,
      created_by: user?.id ?? null,
    })
  if (movError) throw movError
}

export async function deleteStockItem(stockItemId: string): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .delete()
    .eq('id', stockItemId)
  if (error) throw error
}

export type RestoreStockItem = {
  group_id: string
  product_id: string
  quantity: number
  unit: string
  min_quantity: number | null
}

export async function restoreStockItem(item: RestoreStockItem): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock_items')
    .insert({
      group_id: item.group_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      min_quantity: item.min_quantity,
    })
    .select()
    .single()
  if (error) throw error
  return data as StockItem
}
