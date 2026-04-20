import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Pencil, Trash2, Store, CalendarDays, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  fetchPurchaseById,
  fetchPurchaseItems,
  deletePurchase,
} from '@/features/purchases/purchasesService'
import { formatCurrency, formatDateLong, formatQuantity } from '@/lib/format'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'

function DetailSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-4 w-24" />
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  )
}

const STORE_TYPE_LABEL: Record<string, string> = {
  supermercado: 'Supermercado',
  verduleria: 'Verdulería',
  carniceria: 'Carnicería',
  mayorista: 'Mayorista',
  chino: 'Chino',
  online: 'Online',
  otro: 'Otro',
}

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const qc = useQueryClient()

  const { data: purchase, isLoading: loadingPurchase } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => fetchPurchaseById(id!),
    enabled: !!id,
  })

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['purchase-items', id],
    queryFn: () => fetchPurchaseItems(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePurchase(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases', currentGroupId] })
      qc.invalidateQueries({ queryKey: ['stock', currentGroupId] })
      toast.success('Compra eliminada')
      navigate('/purchases')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (loadingPurchase || loadingItems) return <DetailSkeleton />
  if (!purchase) return (
    <div className="py-8 text-center text-muted-foreground text-sm">Compra no encontrada.</div>
  )

  const store = purchase.stores

  return (
    <div className="py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">Detalle de compra</h1>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/purchases/${id}/edit`)}
            aria-label="Editar compra"
          >
            <Pencil size={18} />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Eliminar compra">
                <Trash2 size={18} />
              </Button>
            </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta compra?</AlertDialogTitle>
              <AlertDialogDescription>
                Se revertirán los movimientos de stock asociados. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Store size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{store?.name ?? 'Sin comercio'}</p>
            {store?.type && (
              <p className="text-xs text-muted-foreground">{STORE_TYPE_LABEL[store.type] ?? store.type}</p>
            )}
          </div>
          <p className="text-xl font-bold tabular-nums shrink-0">{formatCurrency(purchase.total)}</p>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {formatDateLong(purchase.purchase_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText size={14} />
            {items.length} ítem{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        {purchase.notes && (
          <p className="text-sm text-muted-foreground italic border-t pt-3">
            {purchase.notes}
          </p>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground px-1">Ítems</h2>

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sin ítems registrados.</p>
        )}

        {items.map(item => {
          const product = item.products
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {product?.name ?? 'Producto eliminado'}
                  {product?.brand && (
                    <span className="font-normal text-muted-foreground"> — {product.brand}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatQuantity(item.quantity)} {item.unit}
                  {' · '}
                  {formatCurrency(item.unit_price)} c/u
                </p>
              </div>
              <p className="font-semibold text-sm tabular-nums shrink-0">
                {formatCurrency(item.total)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Total footer */}
      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          <span className="font-medium">Total</span>
          <span className="text-lg font-bold tabular-nums">{formatCurrency(purchase.total)}</span>
        </div>
      )}
    </div>
  )
}
