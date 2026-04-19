import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { Package, Minus, Plus, FileDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManualAdjustDialog } from '@/components/forms/ManualAdjustDialog'
import { StockPDFDocument } from '@/features/stock/StockPDF'
import {
  fetchStockItems,
  adjustStock,
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

function StockItemCard({
  item,
  onQuickAdjust,
  onManualAdjust,
}: {
  item: StockItemWithProduct
  onQuickAdjust: (delta: number) => void
  onManualAdjust: () => void
}) {
  const low = isLow(item)
  const out = isOut(item)

  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition-colors ${out ? 'border-destructive/30 bg-destructive/5' : low ? 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
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
  )
}

export function StockPage() {
  const { currentGroupId, currentGroupName } = useCurrentGroup()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [adjustItem, setAdjustItem] = useState<StockItemWithProduct | null>(null)
  const [exporting, setExporting] = useState(false)

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

  const missingCount = stockItems.filter(i => isOut(i) || isLow(i)).length

  async function handleExportPDF() {
    const missing = stockItems.filter(i => isOut(i) || isLow(i))
    if (missing.length === 0) {
      toast.info('No hay productos por reponer')
      return
    }
    setExporting(true)
    try {
      const blob = await pdf(
        <StockPDFDocument items={missing} groupName={currentGroupName ?? 'Mi grupo'} />
      ).toBlob()
      saveAs(blob, `lista-compras-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF descargado')
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setExporting(false)
    }
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
          onClick={handleExportPDF}
          disabled={exporting}
        >
          <FileDown size={15} />
          {exporting ? 'Generando...' : 'Exportar lista'}
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
        <div className="space-y-2">
          {filtered.map(item => (
            <StockItemCard
              key={item.id}
              item={item}
              onQuickAdjust={delta => handleQuickAdjust(item, delta)}
              onManualAdjust={() => setAdjustItem(item)}
            />
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
    </div>
  )
}
