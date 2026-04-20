import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Copy, Globe, Loader2, LogOut, MoreVertical, Share2, Trash2, Users, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { useAuth } from '@/features/auth/useAuth'
import { signOut } from '@/features/auth/authService'
import { fetchBudget, upsertBudget } from '@/features/budgets/budgetsService'
import { fetchUserGroups, leaveGroup, deleteGroup } from '@/features/groups/groupsService'
import { useIsAdmin } from '@/features/admin/useIsAdmin'
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
  const { isAdmin } = useIsAdmin()
  const qc = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null)

  const { data: budget } = useQuery({
    queryKey: ['budget', currentGroupId, thisMonth],
    queryFn: () => fetchBudget(currentGroupId!, thisMonth),
    enabled: !!currentGroupId,
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups'],
    queryFn: fetchUserGroups,
    enabled: !!user,
  })

  const currentRole = groups.find(g => g.id === currentGroupId)?.role
  const isOwner = currentRole === 'owner'

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(currentGroupId!),
    onSuccess: () => {
      toast.success('Saliste del grupo')
      clearCurrentGroup()
      qc.invalidateQueries({ queryKey: ['user-groups'] })
      navigate('/groups')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(currentGroupId!),
    onSuccess: () => {
      toast.success('Grupo eliminado')
      clearCurrentGroup()
      qc.invalidateQueries({ queryKey: ['user-groups'] })
      navigate('/groups')
    },
    onError: (err: Error) => toast.error(err.message),
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

  async function handleCopyId() {
    if (!currentGroupId) return
    try {
      await navigator.clipboard.writeText(currentGroupId)
      toast.success('ID copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  async function handleShareInvite() {
    if (!currentGroupId) return
    const text = `Unite a mi grupo "${currentGroupName}" en Super Tracker. Código: ${currentGroupId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Invitación a Super Tracker', text })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Invitación copiada al portapapeles')
    } catch {
      toast.error('No se pudo compartir')
    }
  }

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-lg font-semibold">Configuración</h1>

      {/* Group info */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={16} />
            Grupo activo
          </CardTitle>
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="p-1.5 -mr-1 rounded-md hover:bg-accent transition-colors"
                aria-label="Más opciones"
              >
                <MoreVertical size={16} className="text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1">
              <button
                onClick={() => { setMenuOpen(false); setConfirm('leave') }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent transition-colors"
              >
                <LogOut size={14} />
                Abandonar grupo
              </button>
              {isOwner && (
                <button
                  onClick={() => { setMenuOpen(false); setConfirm('delete') }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar grupo
                </button>
              )}
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-medium">{currentGroupName}</p>
          <p className="text-xs text-muted-foreground break-all">{currentGroupId}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyId}>
              <Copy size={14} />
              Copiar ID
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleShareInvite}>
              <Share2 size={14} />
              Invitar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSwitchGroup}>
              Cambiar grupo
            </Button>
          </div>
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
                step="1"
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

      {/* Admin */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe size={16} />
              Administración
            </CardTitle>
            <CardDescription>Catálogo de productos compartido entre todos los grupos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/admin/products')}>
              Gestionar catálogo global
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut size={15} />
          Cerrar sesión
        </Button>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'leave' ? '¿Abandonar grupo?' : '¿Eliminar grupo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'leave'
                ? `Vas a salir de "${currentGroupName}". Vas a dejar de ver sus compras, stock y reportes. Podés volver a unirte si tenés el código.`
                : `Vas a eliminar "${currentGroupName}" y todos sus datos (compras, stock, presupuestos). Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => (confirm === 'leave' ? leaveMutation.mutate() : deleteMutation.mutate())}
              className={confirm === 'delete' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
              disabled={leaveMutation.isPending || deleteMutation.isPending}
            >
              {(leaveMutation.isPending || deleteMutation.isPending) && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              {confirm === 'leave' ? 'Abandonar' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
