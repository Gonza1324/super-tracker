import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Store, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Fab } from '@/components/ui/fab'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { fetchPurchases, type PurchaseWithStore, type PurchaseFilters } from '@/features/purchases/purchasesService'
import { fetchStores } from '@/features/stores/storesService'
import { formatCurrency, formatDateShort } from '@/lib/format'

function groupByMonth(purchases: PurchaseWithStore[]) {
  const map = new Map<string, PurchaseWithStore[]>()
  for (const p of purchases) {
    const key = p.purchase_date.slice(0, 7) // YYYY-MM
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return map
}

function MonthHeader({ monthKey }: { monthKey: string }) {
  const date = new Date(monthKey + '-01T00:00:00')
  const label = format(date, "MMMM yyyy", { locale: es })
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-4 pb-1 capitalize">
      {label}
    </h2>
  )
}

function PurchaseCard({ purchase, onClick }: { purchase: PurchaseWithStore; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-accent transition-colors"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Store size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {purchase.stores?.name ?? 'Sin comercio'}
        </p>
        <p className="text-xs text-muted-foreground">{formatDateShort(purchase.purchase_date)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-sm tabular-nums">{formatCurrency(purchase.total)}</p>
      </div>
    </button>
  )
}

function PurchaseSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function PurchasesPage() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<PurchaseFilters>({})

  const { data: stores = [] } = useQuery({
    queryKey: ['stores', currentGroupId],
    queryFn: () => fetchStores(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases', currentGroupId, filters],
    queryFn: () => fetchPurchases(currentGroupId!, filters),
    enabled: !!currentGroupId,
  })

  const grouped = groupByMonth(purchases)
  const activeFilterCount = [filters.storeId, filters.dateFrom, filters.dateTo].filter(Boolean).length

  function clearFilters() {
    setFilters({})
  }

  const thisMonth = format(new Date(), 'yyyy-MM')
  const monthTotal = (grouped.get(thisMonth) ?? []).reduce((s, p) => s + p.total, 0)

  if (!currentGroupId) return null

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Compras</h1>
          {purchases.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Este mes: {formatCurrency(monthTotal)}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFilters(f => !f)}
          className="relative"
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtros</span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Comercio</Label>
            <Select
              value={filters.storeId ?? 'all'}
              onValueChange={v => setFilters(f => ({ ...f, storeId: v === 'all' ? null : v }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los comercios</SelectItem>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="h-9"
                value={filters.dateFrom ?? ''}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="h-9"
                value={filters.dateTo ?? ''}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || null }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.storeId && (
            <Badge variant="secondary" className="gap-1">
              {stores.find(s => s.id === filters.storeId)?.name}
              <button onClick={() => setFilters(f => ({ ...f, storeId: null }))}>
                <X size={10} />
              </button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              {filters.dateFrom && formatDateShort(filters.dateFrom)}
              {filters.dateFrom && filters.dateTo && ' – '}
              {filters.dateTo && formatDateShort(filters.dateTo)}
              <button onClick={() => setFilters(f => ({ ...f, dateFrom: null, dateTo: null }))}>
                <X size={10} />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Lista */}
      {isLoading && <PurchaseSkeleton />}

      {!isLoading && purchases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Store size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {activeFilterCount > 0 ? 'Sin resultados para ese filtro' : 'Todavía no cargaste compras'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeFilterCount > 0
                ? 'Probá con otros filtros'
                : 'Empezá registrando tu primera compra'}
            </p>
          </div>
          {activeFilterCount === 0 && (
            <Button size="sm" onClick={() => navigate('/purchases/new')} className="gap-2">
              <Plus size={14} /> Nueva compra
            </Button>
          )}
        </div>
      )}

      {!isLoading && purchases.length > 0 && (
        <div className="space-y-1">
          {Array.from(grouped.entries()).map(([monthKey, monthPurchases]) => (
            <div key={monthKey}>
              <MonthHeader monthKey={monthKey} />
              <div className="space-y-2">
                {monthPurchases.map(p => (
                  <PurchaseCard
                    key={p.id}
                    purchase={p}
                    onClick={() => navigate(`/purchases/${p.id}`)}
                  />
                ))}
              </div>
              <div className="flex justify-end px-1 pt-2">
                <span className="text-xs text-muted-foreground">
                  Subtotal: {formatCurrency(monthPurchases.reduce((s, p) => s + p.total, 0))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Fab
        onClick={() => navigate('/purchases/new')}
        icon={<Plus size={18} />}
        label="Nueva compra"
      />
    </div>
  )
}
