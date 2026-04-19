import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { StoreCombobox } from '@/components/forms/StoreCombobox'
import { ProductCombobox } from '@/components/forms/ProductCombobox'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { createPurchase } from '@/features/purchases/purchasesService'
import { formatCurrency } from '@/lib/format'
import type { Store } from '@/features/stores/storesService'
import type { Product } from '@/features/products/productsService'

const UNITS = ['un', 'kg', 'g', 'l', 'ml'] as const

const itemSchema = z.object({
  product_id: z.string().min(1, 'Elegí un producto'),
  product: z.custom<Product>().nullable(),
  quantity: z.coerce.number().positive('Debe ser mayor a 0'),
  unit: z.enum(UNITS),
  unit_price: z.coerce.number().min(0, 'Precio inválido'),
  total: z.coerce.number().min(0),
})

const purchaseSchema = z.object({
  store: z.custom<Store>().nullable(),
  store_id: z.string().nullable(),
  purchase_date: z.string().min(1, 'Requerido'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Agregá al menos un ítem'),
})

type PurchaseFormValues = z.infer<typeof purchaseSchema>

function defaultItem(): PurchaseFormValues['items'][0] {
  return {
    product_id: '',
    product: null,
    quantity: 1,
    unit: 'un',
    unit_price: 0,
    total: 0,
  }
}

function ItemRow({
  index,
  groupId,
  control,
  register,
  setValue,
  remove,
}: {
  index: number
  groupId: string
  control: ReturnType<typeof useForm<PurchaseFormValues>>['control']
  register: ReturnType<typeof useForm<PurchaseFormValues>>['register']
  setValue: ReturnType<typeof useForm<PurchaseFormValues>>['setValue']
  remove: () => void
}) {
  const quantity = useWatch({ control, name: `items.${index}.quantity` })
  const unitPrice = useWatch({ control, name: `items.${index}.unit_price` })

  useEffect(() => {
    const qty = Number(quantity) || 0
    const price = Number(unitPrice) || 0
    const computed = parseFloat((qty * price).toFixed(2))
    setValue(`items.${index}.total`, computed, { shouldDirty: true })
  }, [quantity, unitPrice, index, setValue])

  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      {/* Product selector */}
      <Controller
        control={control}
        name={`items.${index}.product_id`}
        render={({ field, fieldState }) => (
          <Controller
            control={control}
            name={`items.${index}.product`}
            render={({ field: productField }) => (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Producto</Label>
                <ProductCombobox
                  groupId={groupId}
                  value={field.value || null}
                  onChange={(p) => {
                    field.onChange(p?.id ?? '')
                    productField.onChange(p)
                    if (p?.default_unit) {
                      setValue(`items.${index}.unit`, p.default_unit as typeof UNITS[number])
                    }
                  }}
                  error={fieldState.error?.message}
                />
              </div>
            )}
          />
        )}
      />

      {/* Qty / Unit / Price / Total */}
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cantidad</Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-9"
            {...register(`items.${index}.quantity`)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Unidad</Label>
          <Controller
            control={control}
            name={`items.${index}.unit`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">P. unitario</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-9"
            placeholder="0,00"
            {...register(`items.${index}.unit_price`)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Total</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-9"
            placeholder="0,00"
            {...register(`items.${index}.total`)}
          />
        </div>
      </div>

      {/* Remove */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={remove}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={13} />
          Eliminar
        </button>
      </div>
    </div>
  )
}

export function NewPurchasePage() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const qc = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      store: null,
      store_id: null,
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      items: [defaultItem()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)

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
      {/* Header */}
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

      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-6">
        {/* Comercio + Fecha */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Comercio <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Controller
              control={control}
              name="store_id"
              render={({ field }) => (
                <Controller
                  control={control}
                  name="store"
                  render={({ field: storeField }) => (
                    <StoreCombobox
                      groupId={currentGroupId}
                      value={field.value}
                      onChange={(store) => {
                        field.onChange(store?.id ?? null)
                        storeField.onChange(store)
                      }}
                    />
                  )}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase_date">Fecha</Label>
            <Input
              id="purchase_date"
              type="date"
              className="w-full"
              {...register('purchase_date')}
            />
            {errors.purchase_date && (
              <p className="text-xs text-destructive">{errors.purchase_date.message}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Ítems */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Ítems</h2>
            <span className="text-sm text-muted-foreground">{fields.length} ítem{fields.length !== 1 ? 's' : ''}</span>
          </div>

          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}

          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              groupId={currentGroupId}
              control={control}
              register={register}
              setValue={setValue}
              remove={() => remove(index)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => append(defaultItem())}
          >
            <Plus size={16} />
            Agregar ítem
          </Button>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between py-1">
          <span className="font-medium">Total de la compra</span>
          <span className="text-xl font-semibold tabular-nums">{formatCurrency(grandTotal)}</span>
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input
            id="notes"
            placeholder="Ofertas, descuentos, etc."
            {...register('notes')}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
          Guardar compra
        </Button>
      </form>
    </div>
  )
}
