import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Globe, Loader2, Plus, ScanLine, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Fab } from '@/components/ui/fab'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { BarcodeScannerDialog } from '@/components/forms/BarcodeScannerDialog'
import { useIsAdmin } from '@/features/admin/useIsAdmin'
import {
  fetchGlobalProducts,
  fetchGlobalCategories,
  createGlobalProduct,
  deleteGlobalProduct,
  type GlobalProduct,
} from '@/features/admin/globalProductsService'
import { UNIT_OPTIONS, UNIT_VALUES, BARCODE_PATTERN, BARCODE_ERROR } from '@/features/products/units'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  defaultUnit: z.enum(UNIT_VALUES),
  barcode: z.string().optional().refine(v => !v || BARCODE_PATTERN.test(v), BARCODE_ERROR),
})
type Values = z.infer<typeof schema>

export function AdminProductsPage() {
  const { isAdmin, loading } = useIsAdmin()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [toDelete, setToDelete] = useState<GlobalProduct | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['global-products'],
    queryFn: fetchGlobalProducts,
    enabled: isAdmin,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['global-categories'],
    queryFn: fetchGlobalCategories,
    enabled: isAdmin,
  })

  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { defaultUnit: 'un' },
  })

  const createMutation = useMutation({
    mutationFn: (v: Values) =>
      createGlobalProduct({
        name: v.name,
        brand: v.brand ?? null,
        categoryId: v.categoryId ?? null,
        defaultUnit: v.defaultUnit,
        barcode: v.barcode ?? null,
      }),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: ['global-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success(`"${product.name}" agregado al catálogo global`)
      reset()
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGlobalProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto eliminado')
      setToDelete(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').includes(search)
    )
  }, [products, search])

  const categoryById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Globe size={18} />
            Catálogo global
          </h1>
          <p className="text-xs text-muted-foreground">
            {products.length} producto{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''} para todos los grupos
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, marca o código..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          {products.length === 0 ? 'Todavía no hay productos globales.' : 'Sin resultados.'}
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(p => {
            const cat = p.category_id ? categoryById.get(p.category_id) : null
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                  {cat?.icon ?? '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.name}
                    {p.brand && (
                      <span className="font-normal text-muted-foreground text-xs"> — {p.brand}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {p.default_unit}{p.barcode ? ` · ${p.barcode}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setToDelete(p)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Fab
        onClick={() => setFormOpen(true)}
        icon={<Plus size={18} />}
        label="Nuevo producto"
      />

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) reset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo producto global</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(v => createMutation.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="gpName">Nombre</Label>
              <Input id="gpName" placeholder="Leche entera 1L" autoFocus {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpBrand">Marca <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="gpBrand" placeholder="La Serenísima..." {...register('brand')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpBarcode">Código de barras <span className="text-muted-foreground">(opcional)</span></Label>
              <div className="flex gap-2">
                <Input id="gpBarcode" inputMode="numeric" placeholder="EAN-13, UPC..." {...register('barcode')} />
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
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
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

      {/* Delete confirm */}
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto global?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar "{toDelete?.name}" del catálogo global. Si está siendo usado en compras de algún grupo, la operación puede fallar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
