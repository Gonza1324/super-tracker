import { AlertTriangle, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/format'
import type { Budget } from '@/features/budgets/budgetsService'

interface Props {
  budget: Budget
  spent: number
}

export function BudgetBanner({ budget, spent }: Props) {
  const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
  const over = pct >= 100
  const warning = pct >= budget.alert_threshold * 100

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${over ? 'border-destructive/50 bg-destructive/5' : warning ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(over || warning) && (
            <AlertTriangle size={15} className={over ? 'text-destructive' : 'text-yellow-600'} />
          )}
          {!over && !warning && <TrendingUp size={15} className="text-muted-foreground" />}
          <span className="text-sm font-medium">Presupuesto del mes</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {Math.round(pct)}%
        </span>
      </div>

      <Progress
        value={Math.min(pct, 100)}
        className={`h-2 ${over ? '[&>div]:bg-destructive' : warning ? '[&>div]:bg-yellow-500' : ''}`}
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(spent)} gastado</span>
        <span>de {formatCurrency(budget.amount)}</span>
      </div>

      {over && (
        <p className="text-xs text-destructive font-medium">
          Excediste el presupuesto en {formatCurrency(spent - budget.amount)}
        </p>
      )}
      {!over && warning && (
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          Superaste el umbral de alerta ({Math.round(budget.alert_threshold * 100)}%)
        </p>
      )}
    </div>
  )
}
