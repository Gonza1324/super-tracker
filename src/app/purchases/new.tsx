import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { createPurchase } from '@/features/purchases/purchasesService'
import { PurchaseForm, emptyPurchaseDefaults, type PurchaseFormValues } from '@/components/forms/PurchaseForm'

export function NewPurchasePage() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: PurchaseFormValues) =>
      createPurchase(
        currentGroupId!,
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
    onSuccess: (purchase) => {
      qc.invalidateQueries({ queryKey: ['purchases', currentGroupId] })
      qc.invalidateQueries({ queryKey: ['stock', currentGroupId] })
      toast.success('Compra guardada')
      navigate(`/purchases/${purchase.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (!currentGroupId) return null

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
        <h1 className="text-lg font-semibold">Nueva compra</h1>
      </div>

      <PurchaseForm
        groupId={currentGroupId}
        defaultValues={emptyPurchaseDefaults()}
        submitLabel="Guardar compra"
        isPending={mutation.isPending}
        onSubmit={(v) => mutation.mutate(v)}
      />
    </div>
  )
}
