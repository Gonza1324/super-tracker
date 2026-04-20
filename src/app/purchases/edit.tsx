import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import {
  fetchPurchaseById,
  fetchPurchaseItems,
  updatePurchase,
} from '@/features/purchases/purchasesService'
import { fetchProducts } from '@/features/products/productsService'
import type { Store } from '@/features/stores/storesService'
import { PurchaseForm, type PurchaseFormValues } from '@/components/forms/PurchaseForm'

export function EditPurchasePage() {
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

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', currentGroupId],
    queryFn: () => fetchProducts(currentGroupId!),
    enabled: !!currentGroupId,
  })

  const defaults = useMemo<PurchaseFormValues | null>(() => {
    if (!purchase) return null
    const productById = new Map(products.map(p => [p.id, p]))
    return {
      store: (purchase.stores as Store | null) ?? null,
      store_id: purchase.store_id,
      purchase_date: purchase.purchase_date,
      notes: purchase.notes ?? '',
      items: items.length > 0
        ? items.map(it => ({
            product_id: it.product_id,
            product: productById.get(it.product_id) ?? null,
            quantity: Number(it.quantity),
            unit: it.unit as PurchaseFormValues['items'][0]['unit'],
            unit_price: Number(it.unit_price),
            total: Number(it.total),
          }))
        : [],
    }
  }, [purchase, items, products])

  const mutation = useMutation({
    mutationFn: (values: PurchaseFormValues) =>
      updatePurchase(
        id!,
        values.store_id,
        values.purchase_date,
        values.notes ?? null,
        values.items.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases', currentGroupId] })
      qc.invalidateQueries({ queryKey: ['purchase', id] })
      qc.invalidateQueries({ queryKey: ['purchase-items', id] })
      qc.invalidateQueries({ queryKey: ['stock', currentGroupId] })
      toast.success('Compra actualizada')
      navigate(`/purchases/${id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (!currentGroupId) return null

  const loading = loadingPurchase || loadingItems || loadingProducts

  return (
    <div className="py-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1 rounded-md hover:bg-accent transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Editar compra</h1>
      </div>

      {loading || !defaults ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <PurchaseForm
          groupId={currentGroupId}
          defaultValues={defaults}
          submitLabel="Guardar cambios"
          isPending={mutation.isPending}
          onSubmit={(v) => mutation.mutate(v)}
        />
      )}
    </div>
  )
}
