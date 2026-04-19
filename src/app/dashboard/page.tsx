import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ShoppingCart, Package, BarChart3, Store, AlertTriangle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { useAuth } from '@/features/auth/useAuth'
import { fetchPurchases } from '@/features/purchases/purchasesService'
import { fetchStockItems } from '@/features/stock/stockService'
import { fetchMonthTotal } from '@/features/reports/reportsService'
import { fetchBudget } from '@/features/budgets/budgetsService'
import { formatCurrency, formatDateShort } from '@/lib/format'

const thisMonth = format(new Date(), 'yyyy-MM')
const thisMonthFirst = thisMonth + '-01'

export function DashboardPage() {
  const navigate = useNavigate()
  const { currentGroupId, currentGroupName } = useCurrentGroup()
  const { user } = useAuth()

  const { data: monthTotal = 0, isLoading: loadingTotal } = useQuery({
    queryKey: ['month-total', currentGroupId, thisMonth],
    queryFn: () => fetchMonthTotal(currentGroupId!, thisMonth),
    enabled: !!currentGroupId,
  })

  const { data: budget } = useQuery({
    queryKey: ['budget', currentGroupId, thisMonthFirst],
    queryFn: () => fetchBudget(currentGroupId!, thisMonthFirst),
    enabled: !!currentGroupId,
  })

  const { data: recentPurchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ['purchases', currentGroupId, {}],
    queryFn: () => fetchPurchases(currentGroupId!, {}, 0, 3),
    enabled: !!currentGroupId,
  })

  const { data: stockItems = [], isLoading: loadingStock } = useQuery({
    queryKey: ['stock', currentGroupId],
    queryFn: () => fetchStockItems(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const lowStock = stockItems
    .filter(i => i.quantity === 0 || (i.min_quantity !== null && i.quantity <= i.min_quantity))
    .slice(0, 5)

  const budgetPct = budget && budget.amount > 0 ? Math.min((monthTotal / budget.amount) * 100, 100) : null
  const budgetOver = budget && monthTotal > budget.amount
  const budgetWarning = budget && budgetPct !== null && budgetPct >= budget.alert_threshold * 100

  if (!currentGroupId) return null

  return (
    <div className="py-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold">{currentGroupName}</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email?.split('@')[0] ?? 'Hola'} · {format(new Date(), "EEEE d 'de' MMMM").replace(/^\w/, c => c.toUpperCase())}
        </p>
      </div>

      {/* Este mes */}
      <Card className={budgetOver ? 'border-destructive/50' : budgetWarning ? 'border-yellow-500/50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center justify-between">
            Este mes
            <button onClick={() => navigate('/reports')} className="text-primary text-xs hover:underline">Ver reportes →</button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingTotal ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(monthTotal)}</p>
          )}

          {budget && budgetPct !== null && (
            <div className="space-y-1.5">
              <Progress
                value={budgetPct}
                className={`h-1.5 ${budgetOver ? '[&>div]:bg-destructive' : budgetWarning ? '[&>div]:bg-yellow-500' : ''}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={budgetOver ? 'text-destructive font-medium' : budgetWarning ? 'text-yellow-600 font-medium' : ''}>
                  {budgetOver
                    ? `Excediste el presupuesto en ${formatCurrency(monthTotal - budget.amount)}`
                    : `${Math.round(budgetPct)}% del presupuesto`}
                </span>
                <span>{formatCurrency(budget.amount)}</span>
              </div>
            </div>
          )}

          {!budget && !loadingTotal && (
            <button onClick={() => navigate('/settings')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              + Agregar presupuesto mensual
            </button>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Nueva compra', icon: ShoppingCart, color: 'bg-primary/10 text-primary', to: '/purchases/new' },
          { label: 'Ver stock', icon: Package, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', to: '/stock' },
          { label: 'Reportes', icon: BarChart3, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400', to: '/reports' },
        ].map(({ label, icon: Icon, color, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:bg-accent transition-colors min-h-[80px]"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon size={20} />
            </div>
            <span className="text-xs font-medium text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Últimas compras */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Últimas compras</h2>
          <button onClick={() => navigate('/purchases')} className="text-xs text-primary hover:underline">
            Ver todas
          </button>
        </div>

        {loadingPurchases && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        )}

        {!loadingPurchases && recentPurchases.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Todavía no cargaste compras.</p>
            <Button size="sm" className="mt-3 gap-2" onClick={() => navigate('/purchases/new')}>
              <ShoppingCart size={14} /> Nueva compra
            </Button>
          </div>
        )}

        {!loadingPurchases && recentPurchases.length > 0 && (
          <div className="space-y-2">
            {recentPurchases.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/purchases/${p.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Store size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm truncate">{p.stores?.name ?? 'Sin comercio'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateShort(p.purchase_date)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-semibold text-sm tabular-nums">{formatCurrency(p.total)}</p>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Se está acabando */}
      {(loadingStock || lowStock.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-yellow-600" />
              Se está acabando
            </h2>
            <button onClick={() => navigate('/stock')} className="text-xs text-primary hover:underline">
              Ver stock
            </button>
          </div>

          {loadingStock && (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          )}

          {!loadingStock && (
            <div className="space-y-2">
              {lowStock.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${item.quantity === 0 ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20'}`}
                >
                  <span className="text-base shrink-0">{item.products?.categories?.icon ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.products?.name ?? 'Producto'}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity === 0 ? 'Sin stock' : `${item.quantity} ${item.unit}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
