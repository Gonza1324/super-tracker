import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, LogOut, Users, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { useAuth } from '@/features/auth/useAuth'
import { signOut } from '@/features/auth/authService'
import { fetchBudget, upsertBudget } from '@/features/budgets/budgetsService'
import { formatCurrency } from '@/lib/format'

const schema = z.object({
  amount: z.coerce.number().positive('Debe ser mayor a 0'),
  alertThreshold: z.coerce.number().min(1).max(100),
})
type Values = z.infer<typeof schema>

const thisMonth = format(new Date(), 'yyyy-MM') + '-01'

export function SettingsPage() {
  const navigate = useNavigate()
  const { currentGroupId, currentGroupName, clearCurrentGroup } = useCurrentGroup()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: budget } = useQuery({
    queryKey: ['budget', currentGroupId, thisMonth],
    queryFn: () => fetchBudget(currentGroupId!, thisMonth),
    enabled: !!currentGroupId,
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { amount: 0, alertThreshold: 80 },
  })

  useEffect(() => {
    if (budget) {
      reset({
        amount: budget.amount,
        alertThreshold: Math.round(budget.alert_threshold * 100),
      })
    }
  }, [budget, reset])

  const amount = watch('amount')
  const threshold = watch('alertThreshold')

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      upsertBudget(currentGroupId!, thisMonth, v.amount, v.alertThreshold / 100),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget', currentGroupId] })
      toast.success('Presupuesto guardado')
      reset({ amount, alertThreshold: threshold })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  async function handleSignOut() {
    clearCurrentGroup()
    await signOut()
    navigate('/login')
  }

  function handleSwitchGroup() {
    clearCurrentGroup()
    navigate('/groups')
  }

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-lg font-semibold">Configuración</h1>

      {/* Group info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={16} />
            Grupo activo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-medium">{currentGroupName}</p>
          <p className="text-xs text-muted-foreground break-all">{currentGroupId}</p>
          <Button variant="outline" size="sm" onClick={handleSwitchGroup}>
            Cambiar grupo
          </Button>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet size={16} />
            Presupuesto mensual
          </CardTitle>
          <CardDescription>Para {format(new Date(), 'MMMM yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (ARS)</Label>
              <Input
                id="amount"
                type="number"
                step="100"
                min="1"
                placeholder="50000"
                {...register('amount')}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              {Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(Number(amount))}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertThreshold">
                Umbral de alerta: <span className="font-semibold">{threshold}%</span>
              </Label>
              <Input
                id="alertThreshold"
                type="range"
                min="50"
                max="100"
                step="5"
                className="h-2 cursor-pointer"
                {...register('alertThreshold')}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50%</span>
                <span>Alerta al {threshold}% ({formatCurrency(Number(amount) * threshold / 100)})</span>
                <span>100%</span>
              </div>
              {errors.alertThreshold && (
                <p className="text-xs text-destructive">{errors.alertThreshold.message}</p>
              )}
            </div>

            <Button type="submit" disabled={mutation.isPending || !isDirty} className="w-full">
              {mutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              {budget ? 'Actualizar presupuesto' : 'Guardar presupuesto'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Account */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut size={15} />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
