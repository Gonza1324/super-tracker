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
