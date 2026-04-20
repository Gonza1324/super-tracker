import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductCombobox } from '@/components/forms/ProductCombobox'
import { addStockManual } from '@/features/stock/stockService'
import type { Product } from '@/features/products/productsService'
import { UNIT_OPTIONS, UNIT_VALUES, type Unit } from '@/features/products/units'

interface Props {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddStockDialog({ groupId, open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<Unit>('un')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      setProduct(null)
      setQuantity('1')
      setUnit('un')
      setNotes('')
    }
  }, [open])

  useEffect(() => {
    if (product?.default_unit && UNIT_VALUES.includes(product.default_unit as Unit)) {
      setUnit(product.default_unit as Unit)
    }
  }, [product])

  const mutation = useMutation({
    mutationFn: () =>
      addStockManual(groupId, product!.id, Number(quantity), unit, notes || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', groupId] })
      toast.success(`${product?.name ?? 'Producto'} agregado al stock`)
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const qty = Number(quantity)
  const canSubmit = !!product && qty > 0 && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar a stock</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) mutation.mutate()
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <Label>Producto</Label>
            <ProductCombobox
              groupId={groupId}
              value={product?.id ?? null}
              onChange={setProduct}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addStockQty">Cantidad</Label>
              <Input
                id="addStockQty"
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={v => setUnit(v as Unit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addStockNotes">Nota <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              id="addStockNotes"
              placeholder="Regalo, sobrante, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {mutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Agregar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
