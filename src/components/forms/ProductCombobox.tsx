import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
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
import { NewProductDialog } from '@/components/forms/NewProductDialog'
import { fetchProducts, type Product } from '@/features/products/productsService'

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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', groupId],
    queryFn: () => fetchProducts(groupId),
  })

  const selected = products.find(p => p.id === value) ?? null

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').includes(search)
    )
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

      <NewProductDialog
        groupId={groupId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(product) => onChange(product)}
      />
    </>
  )
}
