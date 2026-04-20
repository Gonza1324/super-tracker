import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarcodeScannerDialog } from '@/components/forms/BarcodeScannerDialog'
import { fetchCategories, createProduct, type Product } from '@/features/products/productsService'
import { UNIT_OPTIONS, UNIT_VALUES, BARCODE_PATTERN, BARCODE_ERROR } from '@/features/products/units'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  defaultUnit: z.enum(UNIT_VALUES),
  barcode: z.string().optional().refine(v => !v || BARCODE_PATTERN.test(v), BARCODE_ERROR),
})
type Values = z.infer<typeof schema>

interface Props {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (product: Product) => void
}

export function NewProductDialog({ groupId, open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient()
  const [scannerOpen, setScannerOpen] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => fetchCategories(groupId),
  })

  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { defaultUnit: 'un' },
  })

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      createProduct(groupId, v.name, v.brand ?? null, v.categoryId ?? null, v.defaultUnit, v.barcode ?? null),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: ['products', groupId] })
      toast.success(`Producto "${product.name}" creado`)
      reset()
      onOpenChange(false)
      onCreated?.(product)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="productName">Nombre</Label>
            <Input id="productName" placeholder="Leche, Arroz, etc." autoFocus {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="productBrand">Marca <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id="productBrand" placeholder="La Serenísima, Marolio..." {...register('brand')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productBarcode">Código de barras <span className="text-muted-foreground">(opcional)</span></Label>
            <div className="flex gap-2">
              <Input
                id="productBarcode"
                inputMode="numeric"
                placeholder="EAN-13, UPC..."
                {...register('barcode')}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScannerOpen(true)}
                aria-label="Escanear código"
                className="shrink-0"
              >
                <ScanLine size={16} />
              </Button>
            </div>
            {errors.barcode && <p className="text-xs text-destructive">{errors.barcode.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Controller
                name="defaultUnit"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={(code) => {
          setValue('barcode', code, { shouldValidate: true })
          toast.success(`Código detectado: ${code}`)
        }}
      />
    </Dialog>
  )
}
