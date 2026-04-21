import type { StockItemWithProduct } from '@/features/stock/stockService'

export const NO_CATEGORY_ID = '__none__'
export const NO_CATEGORY_LABEL = 'Sin categoría'
export const NO_CATEGORY_ICON = '📦'

export interface StockGroup {
  id: string
  name: string
  icon: string
  items: StockItemWithProduct[]
}

export function groupByCategory(items: StockItemWithProduct[]): StockGroup[] {
  const map = new Map<string, StockGroup>()
  for (const item of items) {
    const cat = item.products?.categories
    const id = cat?.id ?? NO_CATEGORY_ID
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: cat?.name ?? NO_CATEGORY_LABEL,
        icon: cat?.icon ?? NO_CATEGORY_ICON,
        items: [],
      })
    }
    map.get(id)!.items.push(item)
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.id === NO_CATEGORY_ID) return 1
    if (b.id === NO_CATEGORY_ID) return -1
    return a.name.localeCompare(b.name)
  })
}
