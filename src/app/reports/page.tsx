import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { BudgetBanner } from '@/components/shared/BudgetBanner'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import {
  fetchMonthlyTotals,
  fetchMonthTotal,
  fetchStoreBreakdown,
  fetchTopProducts,
  fetchCategoryBreakdown,
  type PeriodOption,
} from '@/features/reports/reportsService'
import { fetchBudget } from '@/features/budgets/budgetsService'
import { formatCurrency, formatMonthYear } from '@/lib/format'

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#fb923c']

const thisMonth = format(new Date(), 'yyyy-MM')
const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

function monthLabel(m: string) {
  return format(new Date(m + '-01T00:00:00'), 'MMM', { locale: es })
}

// ── Tab: Resumen mensual ──────────────────────────────────────────────────────
function ResumenTab({ groupId }: { groupId: string }) {
  const { data: monthly = [], isLoading: loadingMonthly } = useQuery({
    queryKey: ['monthly-totals', groupId],
    queryFn: () => fetchMonthlyTotals(groupId, 6),
  })

  const { data: budget } = useQuery({
    queryKey: ['budget', groupId, thisMonth + '-01'],
    queryFn: () => fetchBudget(groupId, thisMonth + '-01'),
  })

  const { data: thisTotal = 0 } = useQuery({
    queryKey: ['month-total', groupId, thisMonth],
    queryFn: () => fetchMonthTotal(groupId, thisMonth),
  })

  const { data: lastTotal = 0 } = useQuery({
    queryKey: ['month-total', groupId, lastMonth],
    queryFn: () => fetchMonthTotal(groupId, lastMonth),
  })

  const diff = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null
  const chartData = monthly.map(m => ({
    name: monthLabel(m.month),
    total: m.total,
  }))
  const hasData = monthly.some(m => m.total > 0)

  return (
    <div className="space-y-4">
      {/* Cards row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Este mes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold tabular-nums leading-tight">{formatCurrency(thisTotal)}</p>
            {diff !== null && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${diff > 0 ? 'text-destructive' : diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                {diff > 0 ? '+' : ''}{Math.round(diff)}% vs mes anterior
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Mes anterior</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold tabular-nums leading-tight">{formatCurrency(lastTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatMonthYear(lastMonth + '-01')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget banner */}
      {budget && <BudgetBanner budget={budget} spent={thisTotal} />}

      {/* Line chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Gasto últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {loadingMonthly && <Skeleton className="h-48 w-full" />}
          {!loadingMonthly && !hasData && (
            <EmptyState title="Sin datos aún" description="Cargá tus primeras compras para ver el gráfico" />
          )}
          {!loadingMonthly && hasData && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Gasto" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Tab: Por comercio ─────────────────────────────────────────────────────────
function ComercioTab({ groupId }: { groupId: string }) {
  const [month, setMonth] = useState(thisMonth)
  const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), i), 'yyyy-MM'))

  const { data: breakdown = [], isLoading } = useQuery({
    queryKey: ['store-breakdown', groupId, month],
    queryFn: () => fetchStoreBreakdown(groupId, month),
  })

  const totalMonth = breakdown.reduce((s, r) => s + r.total, 0)

  return (
    <div className="space-y-4">
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m} value={m}>
              {formatMonthYear(m + '-01')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <Skeleton className="h-48 w-full rounded-xl" />}

      {!isLoading && breakdown.length === 0 && (
        <EmptyState title="Sin compras ese mes" description="No hay datos para mostrar" />
      )}

      {!isLoading && breakdown.length > 0 && (
        <>
          <Card>
            <CardContent className="px-2 py-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={breakdown} dataKey="total" nameKey="store_name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                    {breakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {breakdown.map(row => (
              <div key={row.store_id ?? 'none'} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{row.store_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.count} compra{row.count !== 1 ? 's' : ''} · ticket promedio {formatCurrency(row.avg)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm tabular-nums">{formatCurrency(row.total)}</p>
                  <p className="text-xs text-muted-foreground">{totalMonth > 0 ? Math.round((row.total / totalMonth) * 100) : 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab: Top productos ────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<PeriodOption, string> = {
  this_month: 'Este mes',
  last_month: 'Mes pasado',
  last_3_months: 'Últimos 3 meses',
  this_year: 'Este año',
}

function ProductosTab({ groupId }: { groupId: string }) {
  const [period, setPeriod] = useState<PeriodOption>('this_month')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['top-products', groupId, period],
    queryFn: () => fetchTopProducts(groupId, period),
  })

  return (
    <div className="space-y-4">
      <Select value={period} onValueChange={v => setPeriod(v as PeriodOption)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map(p => (
            <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && products.length === 0 && (
        <EmptyState title="Sin datos en ese período" description="Cargá compras para ver el ranking" />
      )}

      {!isLoading && products.length > 0 && (
        <div className="space-y-2">
          {products.map((p, i) => (
            <div key={p.product_id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {p.product_name}
                  {p.brand && <span className="font-normal text-muted-foreground text-xs"> — {p.brand}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.times_bought}× comprado · {p.total_qty.toFixed(1)} u total
                </p>
              </div>
              <p className="font-semibold text-sm tabular-nums shrink-0">{formatCurrency(p.total_spent)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Por categoría ────────────────────────────────────────────────────────
function CategoriaTab({ groupId }: { groupId: string }) {
  const [month, setMonth] = useState(thisMonth)
  const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), i), 'yyyy-MM'))

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ['category-breakdown', groupId, month],
    queryFn: () => fetchCategoryBreakdown(groupId, month),
  })

  const chartData = cats.map(c => ({ name: `${c.icon ?? ''} ${c.category_name}`.trim(), total: c.total }))

  return (
    <div className="space-y-4">
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m} value={m}>{formatMonthYear(m + '-01')}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && cats.length === 0 && (
        <EmptyState title="Sin datos ese mes" description="Cargá compras para ver el desglose por categoría" />
      )}

      {!isLoading && cats.length > 0 && (
        <>
          <Card>
            <CardContent className="px-2 py-4">
              <ResponsiveContainer width="100%" height={Math.max(180, cats.length * 36)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Gasto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {cats.map(cat => (
              <div key={cat.category_id ?? 'none'} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <span className="text-lg w-6 shrink-0">{cat.icon ?? '📦'}</span>
                <p className="flex-1 font-medium text-sm">{cat.category_name}</p>
                <p className="font-semibold text-sm tabular-nums">{formatCurrency(cat.total)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const { currentGroupId } = useCurrentGroup()
  if (!currentGroupId) return null

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-lg font-semibold">Reportes</h1>

      <Tabs defaultValue="resumen">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="comercio" className="text-xs">Comercio</TabsTrigger>
          <TabsTrigger value="productos" className="text-xs">Productos</TabsTrigger>
          <TabsTrigger value="categoria" className="text-xs">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen"><ResumenTab groupId={currentGroupId} /></TabsContent>
        <TabsContent value="comercio"><ComercioTab groupId={currentGroupId} /></TabsContent>
        <TabsContent value="productos"><ProductosTab groupId={currentGroupId} /></TabsContent>
        <TabsContent value="categoria"><CategoriaTab groupId={currentGroupId} /></TabsContent>
      </Tabs>
    </div>
  )
}
