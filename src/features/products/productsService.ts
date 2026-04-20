import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Product = Tables<'products'>
export type Category = Tables<'categories'>

export async function fetchProducts(groupId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select()
    .or(`group_id.eq.${groupId},group_id.is.null`)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchCategories(groupId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select()
    .or(`group_id.eq.${groupId},group_id.is.null`)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function createProduct(
  groupId: string,
  name: string,
  brand: string | null,
  categoryId: string | null,
  defaultUnit: string,
  barcode: string | null = null
): Promise<Product> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('products')
    .insert({
      group_id: groupId,
      name,
      brand: brand || null,
      category_id: categoryId || null,
      default_unit: defaultUnit,
      barcode: barcode || null,
      created_by: user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
