import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database'

export type Purchase = Tables<'purchases'>
export type PurchaseItem = Tables<'purchase_items'>

export type PurchaseWithStore = Purchase & {
  stores: Pick<Tables<'stores'>, 'id' | 'name' | 'type'> | null
}

export type PurchaseItemWithProduct = PurchaseItem & {
  products: Pick<Tables<'products'>, 'id' | 'name' | 'brand' | 'default_unit'> | null
}

export type NewPurchaseItem = {
  product_id: string
  quantity: number
  unit: string
  unit_price: number
  total: number
}

export async function createPurchase(
  groupId: string,
  storeId: string | null,
  purchaseDate: string,
  notes: string | null,
  items: NewPurchaseItem[]
): Promise<Purchase> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      group_id: groupId,
      store_id: storeId,
      purchase_date: purchaseDate,
      notes: notes || null,
      created_by: user?.id ?? null,
    })
    .select()
    .single()

  if (purchaseError) throw purchaseError

  const itemsToInsert: TablesInsert<'purchase_items'>[] = items.map(item => ({
    purchase_id: purchase.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    total: item.total,
  }))

  const { error: itemsError } = await supabase
    .from('purchase_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  return purchase
}

export type PurchaseFilters = {
  storeId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
}

export async function fetchPurchases(
  groupId: string,
  filters: PurchaseFilters = {},
  page = 0,
  pageSize = 30
): Promise<PurchaseWithStore[]> {
  let query = supabase
    .from('purchases')
    .select('*, stores(id, name, type)')
    .eq('group_id', groupId)
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filters.storeId) query = query.eq('store_id', filters.storeId)
  if (filters.dateFrom) query = query.gte('purchase_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('purchase_date', filters.dateTo)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PurchaseWithStore[]
}

export async function fetchPurchaseById(id: string): Promise<PurchaseWithStore> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, stores(id, name, type)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as PurchaseWithStore
}

export async function fetchPurchaseItems(purchaseId: string): Promise<PurchaseItemWithProduct[]> {
  const { data, error } = await supabase
    .from('purchase_items')
    .select('*, products(id, name, brand, default_unit)')
    .eq('purchase_id', purchaseId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as PurchaseItemWithProduct[]
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase.from('purchases').delete().eq('id', id)
  if (error) throw error
}
