import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StockItemWithProduct } from '@/features/stock/stockService'

const schema = z.object({
  delta: z.coerce.number().refine(v => v !== 0, 'Debe ser distinto de 0'),
  type: z.enum(['manual_add', 'manual_remove']),
  notes: z.string().optional(),
})
type Values = z.infer<typeof schema>

interface Props {
  item: StockItemWithProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (delta: number, type: 'manual_add' | 'manual_remove', notes?: string) => void
  isPending: boolean
}

export function ManualAdjustDialog({ item, open, onOpenChange, onSubmit, isPending }: Props) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'manual_add', notes: '' },
  })

  function submit(values: Values) {
    const sign = values.type === 'manual_add' ? 1 : -1
    onSubmit(sign * Math.abs(values.delta), values.type, values.notes)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajuste manual</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{item.products?.name ?? 'Producto'}</span>
          {item.products?.brand && ` — ${item.products.brand}`}
          <br />
          Stock actual: {item.quantity} {item.unit}
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_add">Agregar</SelectItem>
                      <SelectItem value="manual_remove">Quitar</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad ({item.unit})</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="1"
                autoFocus
                {...register('delta')}
              />
              {errors.delta && <p className="text-xs text-destructive">{errors.delta.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Razón <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input placeholder="se venció, lo regalaron..." {...register('notes')} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
