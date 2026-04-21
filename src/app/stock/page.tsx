import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Package, Minus, Plus, ListChecks, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Fab } from '@/components/ui/fab'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManualAdjustDialog } from '@/components/forms/ManualAdjustDialog'
import { AddStockDialog } from '@/components/forms/AddStockDialog'
import { ShoppingListDialog } from '@/features/stock/ShoppingListDialog'
import { groupByCategory } from '@/features/stock/groupByCategory'
import {
  fetchStockItems,
  adjustStock,
  deleteStockItem,
  restoreStockItem,
  type StockItemWithProduct,
} from '@/features/stock/stockService'
import { fetchCategories } from '@/features/products/productsService'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { formatQuantity } from '@/lib/format'

type StockFilter = 'all' | 'in_stock' | 'out_of_stock'

function isLow(item: StockItemWithProduct) {
  return item.min_quantity !== null && item.quantity <= item.min_quantity && item.quantity > 0
}

function isOut(item: StockItemWithProduct) {
  return item.quantity === 0
}

function StockSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
    </div>
  )
}

const SWIPE_THRESHOLD = 90

function StockItemCard({
  item,
  onQuickAdjust,
  onManualAdjust,
  onDelete,
}: {
  item: StockItemWithProduct
  onQuickAdjust: (delta: number) => void
  onManualAdjust: () => void
  onDelete: () => void
}) {
  const low = isLow(item)
  const out = isOut(item)

  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const locked = useRef<'h' | 'v' | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    locked.current = null
    setDragging(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
    if (locked.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      locked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (locked.current === 'h') {
      e.preventDefault()
      setOffset(dx)
    }
  }

  function onTouchEnd() {
    setDragging(false)
    if (locked.current === 'h' && Math.abs(offset) >= SWIPE_THRESHOLD) {
      setOffset(offset > 0 ? 400 : -400)
      window.setTimeout(onDelete, 180)
    } else {
      setOffset(0)
    }
  }

  const showDeleteHint = Math.abs(offset) > 20

  return (
    <div className="relative overflow-hidden rounded-xl">
      {showDeleteHint && (
        <div className={`absolute inset-0 flex items-center px-4 bg-destructive/15 text-destructive ${offset > 0 ? 'justify-start' : 'justify-end'}`}>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Trash2 size={16} />
            Eliminar
          </div>
        </div>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
          touchAction: 'pan-y',
        }}
        className={`flex items-center gap-3 rounded-xl border bg-card px-3 py-3 ${out ? 'border-destructive/30 bg-destructive/5' : low ? 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
      >
      {/* Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${out ? 'bg-destructive/10' : low ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-primary/10'}`}>
        {item.products?.categories?.icon ?? '📦'}
      </div>

      {/* Info */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={onManualAdjust}
      >
        <p className="font-medium text-sm truncate">
          {item.products?.name ?? 'Producto'}
          {item.products?.brand && (
            <span className="font-normal text-muted-foreground text-xs"> — {item.products.brand}</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className={`text-xs ${out ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {out ? 'Sin stock' : `${formatQuantity(item.quantity)} ${item.unit}`}
          </p>
          {out && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Agotado</Badge>}
          {low && <Badge className="text-[10px] h-4 px-1.5 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300">Se acaba</Badge>}
        </div>
      </button>

      {/* Quick +/- */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onQuickAdjust(-1)}
          disabled={item.quantity === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Reducir"
        >
          <Minus size={14} />
        </button>
        <span className="w-8 text-center text-sm tabular-nums font-medium">
          {formatQuantity(item.quantity)}
        </span>
        <button
          onClick={() => onQuickAdjust(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors"
          aria-label="Aumentar"
        >
          <Plus size={14} />
        </button>
      </div>
      </div>
    </div>
  )
}

export function StockPage() {
  const { currentGroupId, currentGroupName } = useCurrentGroup()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [adjustItem, setAdjustItem] = useState<StockItemWithProduct | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [addStockOpen, setAddStockOpen] = useState(false)

  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['stock', currentGroupId],
    queryFn: () => fetchStockItems(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', currentGroupId],
    queryFn: () => fetchCategories(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const adjustMutation = useMutation({
    mutationFn: ({ item, delta, type, notes }: { item: StockItemWithProduct; delta: number; type: 'manual_add' | 'manual_remove'; notes?: string }) =>
      adjustStock(currentGroupId!, item.product_id, item.id, item.quantity, delta, item.unit, type, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', currentGroupId] })
      setAdjustItem(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleQuickAdjust(item: StockItemWithProduct, delta: number) {
    const type = delta > 0 ? 'manual_add' : 'manual_remove'
    adjustMutation.mutate({ item, delta, type })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStockItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', currentGroupId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const restoreMutation = useMutation({
    mutationFn: restoreStockItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock', currentGroupId] }),
    onError: (err: Error) => toast.error(err.message),
  })

  function handleDelete(item: StockItemWithProduct) {
    const snapshot = {
      group_id: item.group_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      min_quantity: item.min_quantity,
    }
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success(`${item.products?.name ?? 'Producto'} eliminado del stock`, {
          action: {
            label: 'Deshacer',
            onClick: () => restoreMutation.mutate(snapshot),
          },
        })
      },
    })
  }

  const filtered = useMemo(() => {
    let result = stockItems
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        (i.products?.name ?? '').toLowerCase().includes(q) ||
        (i.products?.brand ?? '').toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.products?.category_id === categoryFilter)
    }
    if (stockFilter === 'in_stock') result = result.filter(i => i.quantity > 0)
    if (stockFilter === 'out_of_stock') result = result.filter(i => i.quantity === 0)
    return result
  }, [stockItems, search, categoryFilter, stockFilter])

  const grouped = useMemo(() => groupByCategory(filtered), [filtered])

  const missing = useMemo(
    () => stockItems.filter(i => isOut(i) || isLow(i)),
    [stockItems],
  )
  const missingCount = missing.length

  function handleOpenList() {
    if (missingCount === 0) {
      toast.info('No hay productos por reponer')
      return
    }
    setListOpen(true)
  }

  if (!currentGroupId) return null

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Stock</h1>
          {stockItems.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {stockItems.length} producto{stockItems.length !== 1 ? 's' : ''}
              {missingCount > 0 && ` · ${missingCount} por reponer`}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleOpenList}
        >
          <ListChecks size={15} />
          Ver lista
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-32">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border overflow-hidden h-8">
          {([['all', 'Todos'], ['in_stock', 'Con stock'], ['out_of_stock', 'Sin stock']] as [StockFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStockFilter(val)}
              className={`px-3 text-xs transition-colors ${stockFilter === val ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && <StockSkeleton />}

      {!isLoading && stockItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Package size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Todavía no hay stock registrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              El stock se actualiza automáticamente al cargar compras.
            </p>
          </div>
        </div>
      )}

      {!isLoading && stockItems.length > 0 && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Sin resultados para esa búsqueda.
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-5">
          {grouped.map(group => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                <span className="text-base leading-none">{group.icon}</span>
                <span>{group.name}</span>
                <span className="text-[10px] text-muted-foreground/70">· {group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map(item => (
                  <StockItemCard
                    key={item.id}
                    item={item}
                    onQuickAdjust={delta => handleQuickAdjust(item, delta)}
                    onManualAdjust={() => setAdjustItem(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual adjust dialog */}
      {adjustItem && (
        <ManualAdjustDialog
          item={adjustItem}
          open={!!adjustItem}
          onOpenChange={open => !open && setAdjustItem(null)}
          onSubmit={(delta, type, notes) =>
            adjustMutation.mutate({ item: adjustItem, delta, type, notes })
          }
          isPending={adjustMutation.isPending}
        />
      )}

      <Fab
        onClick={() => setAddStockOpen(true)}
        icon={<Plus size={18} />}
        label="Agregar a stock"
      />

      <AddStockDialog
        groupId={currentGroupId}
        open={addStockOpen}
        onOpenChange={setAddStockOpen}
      />

      <ShoppingListDialog
        open={listOpen}
        onOpenChange={setListOpen}
        items={missing}
        groupName={currentGroupName ?? 'Mi grupo'}
      />
    </div>
  )
}
