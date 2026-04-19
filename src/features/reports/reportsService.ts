import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export type MonthlyTotal = { month: string; total: number }
export type StoreBreakdown = { store_id: string | null; store_name: string; total: number; count: number; avg: number }
export type TopProduct = { product_id: string; product_name: string; brand: string | null; total_spent: number; total_qty: number; times_bought: number }
export type CategoryBreakdown = { category_id: string | null; category_name: string; icon: string | null; total: number }

function monthRange(month: string) {
  const date = new Date(month + '-01T00:00:00')
  return {
    from: format(startOfMonth(date), 'yyyy-MM-dd'),
    to: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export async function fetchMonthlyTotals(groupId: string, months = 6): Promise<MonthlyTotal[]> {
  const to = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  const from = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('purchases')
    .select('purchase_date, total')
    .eq('group_id', groupId)
    .gte('purchase_date', from)
    .lte('purchase_date', to)
    .order('purchase_date')
  if (error) throw error

  const byMonth = new Map<string, number>()
  for (let i = months - 1; i >= 0; i--) {
    const key = format(subMonths(new Date(), i), 'yyyy-MM')
    byMonth.set(key, 0)
  }
  for (const row of data ?? []) {
    const key = row.purchase_date.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 0) + row.total)
  }

  return Array.from(byMonth.entries()).map(([month, total]) => ({ month, total }))
}

export async function fetchMonthTotal(groupId: string, month: string): Promise<number> {
  const { from, to } = monthRange(month)
  const { data, error } = await supabase
    .from('purchases')
    .select('total')
    .eq('group_id', groupId)
    .gte('purchase_date', from)
    .lte('purchase_date', to)
  if (error) throw error
  return (data ?? []).reduce((s, r) => s + r.total, 0)
}

export async function fetchStoreBreakdown(groupId: string, month: string): Promise<StoreBreakdown[]> {
  const { from, to } = monthRange(month)
  const { data, error } = await supabase
    .from('purchases')
    .select('store_id, total, stores(name)')
    .eq('group_id', groupId)
    .gte('purchase_date', from)
    .lte('purchase_date', to)
  if (error) throw error

  const map = new Map<string, { name: string; total: number; count: number }>()
  for (const row of data ?? []) {
    const key = row.store_id ?? '__none__'
    const name = (row.stores as { name: string } | null)?.name ?? 'Sin comercio'
    const existing = map.get(key) ?? { name, total: 0, count: 0 }
    map.set(key, { name, total: existing.total + row.total, count: existing.count + 1 })
  }

  return Array.from(map.entries())
    .map(([store_id, v]) => ({
      store_id: store_id === '__none__' ? null : store_id,
      store_name: v.name,
      total: v.total,
      count: v.count,
      avg: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export type PeriodOption = 'this_month' | 'last_month' | 'last_3_months' | 'this_year'

function periodRange(period: PeriodOption): { from: string; to: string } {
  const now = new Date()
  switch (period) {
    case 'this_month':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'last_month': {
      const last = subMonths(now, 1)
      return { from: format(startOfMonth(last), 'yyyy-MM-dd'), to: format(endOfMonth(last), 'yyyy-MM-dd') }
    }
    case 'last_3_months':
      return { from: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'this_year':
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
  }
}

export async function fetchTopProducts(groupId: string, period: PeriodOption): Promise<TopProduct[]> {
  const { from, to } = periodRange(period)
  const { data, error } = await supabase
    .from('purchase_items')
    .select('product_id, quantity, total, products(id, name, brand), purchases!inner(group_id, purchase_date)')
    .eq('purchases.group_id', groupId)
    .gte('purchases.purchase_date', from)
    .lte('purchases.purchase_date', to)
  if (error) throw error

  const map = new Map<string, TopProduct>()
  for (const row of data ?? []) {
    const product = row.products as { id: string; name: string; brand: string | null } | null
    if (!product) continue
    const existing = map.get(product.id) ?? {
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      total_spent: 0,
      total_qty: 0,
      times_bought: 0,
    }
    map.set(product.id, {
      ...existing,
      total_spent: existing.total_spent + row.total,
      total_qty: existing.total_qty + row.quantity,
      times_bought: existing.times_bought + 1,
    })
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 20)
}

export async function fetchCategoryBreakdown(groupId: string, month: string): Promise<CategoryBreakdown[]> {
  const { from, to } = monthRange(month)
  const { data, error } = await supabase
    .from('purchase_items')
    .select('total, products(category_id, categories(id, name, icon)), purchases!inner(group_id, purchase_date)')
    .eq('purchases.group_id', groupId)
    .gte('purchases.purchase_date', from)
    .lte('purchases.purchase_date', to)
  if (error) throw error

  const map = new Map<string, CategoryBreakdown>()
  for (const row of data ?? []) {
    const product = row.products as { category_id: string | null; categories: { id: string; name: string; icon: string | null } | null } | null
    const cat = product?.categories
    const key = cat?.id ?? '__none__'
    const existing = map.get(key) ?? {
      category_id: cat?.id ?? null,
      category_name: cat?.name ?? 'Sin categoría',
      icon: cat?.icon ?? null,
      total: 0,
    }
    map.set(key, { ...existing, total: existing.total + row.total })
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}
