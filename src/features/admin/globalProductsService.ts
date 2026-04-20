import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type GlobalProduct = Tables<'products'>
export type GlobalCategory = Tables<'categories'>

export async function fetchGlobalCategories(): Promise<GlobalCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select()
    .is('group_id', null)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function fetchGlobalProducts(): Promise<GlobalProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select()
    .is('group_id', null)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createGlobalProduct(input: {
  name: string
  brand: string | null
  categoryId: string | null
  defaultUnit: string
  barcode: string | null
}): Promise<GlobalProduct> {
  const { data, error } = await supabase.rpc('create_global_product', {
    p_name: input.name,
    p_brand: input.brand,
    p_category_id: input.categoryId,
    p_default_unit: input.defaultUnit,
    p_barcode: input.barcode,
  })
  if (error) {
    if (error.message?.includes('not_admin')) throw new Error('No tenés permisos de administrador.')
    throw error
  }
  return data as GlobalProduct
}

export async function deleteGlobalProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_global_product', { p_product_id: productId })
  if (error) {
    if (error.message?.includes('not_admin')) throw new Error('No tenés permisos de administrador.')
    if (error.message?.includes('not_global')) throw new Error('Solo se pueden eliminar productos globales.')
    throw error
  }
}
