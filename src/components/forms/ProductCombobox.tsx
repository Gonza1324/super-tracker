import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  type Product,
} from '@/features/products/productsService'

const UNITS = [
  { value: 'un', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
]

const newProductSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  defaultUnit: z.enum(['un', 'kg', 'g', 'l', 'ml']),
})
type NewProductValues = z.infer<typeof newProductSchema>

interface Props {
  groupId: string
  value: string | null
  onChange: (product: Product | null) => void
  error?: string
}

export function ProductCombobox({ groupId, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', groupId],
    queryFn: () => fetchProducts(groupId),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => fetchCategories(groupId),
  })

  const selected = products.find(p => p.id === value) ?? null

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<NewProductValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(newProductSchema) as any,
    defaultValues: { defaultUnit: 'un' },
  })

  const createMutation = useMutation({
    mutationFn: (v: NewProductValues) =>
      createProduct(groupId, v.name, v.brand ?? null, v.categoryId ?? null, v.defaultUnit),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: ['products', groupId] })
      onChange(product)
      setDialogOpen(false)
      setOpen(false)
      reset()
      toast.success(`Producto "${product.name}" creado`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between font-normal min-w-0', !selected && 'text-muted-foreground', error && 'border-destructive')}
          >
            <span className="truncate">
              {selected
                ? selected.brand
                  ? `${selected.name} — ${selected.brand}`
                  : selected.name
                : 'Elegí un producto'}
            </span>
            <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar producto..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading && <CommandEmpty>Cargando...</CommandEmpty>}
              {!isLoading && filtered.length === 0 && <CommandEmpty>No encontrado.</CommandEmpty>}
              <CommandGroup>
                {filtered.slice(0, 30).map(product => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      onChange(selected?.id === product.id ? null : product)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <Check size={14} className={cn('mr-2 shrink-0', selected?.id === product.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{product.name}</span>
                    {product.brand && (
                      <span className="ml-1 text-xs text-muted-foreground truncate">— {product.brand}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => { setOpen(false); setDialogOpen(true) }}
                  className="text-primary"
                >
                  <Plus size={14} className="mr-2" />
                  Nuevo producto
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(v => createMutation.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="productName">Nombre</Label>
              <Input id="productName" placeholder="Leche, Arroz, etc." autoFocus {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="productBrand">Marca <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="productBrand" placeholder="La Serenísima, Marolio..." {...register('brand')} />
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
                        {UNITS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                Crear
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
