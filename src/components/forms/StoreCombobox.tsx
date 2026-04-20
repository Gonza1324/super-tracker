import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchStores, createStore, type Store } from '@/features/stores/storesService'
import type { TablesInsert } from '@/types/database'

const STORE_TYPES: { value: TablesInsert<'stores'>['type']; label: string }[] = [
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'verduleria', label: 'Verdulería' },
  { value: 'carniceria', label: 'Carnicería' },
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'chino', label: 'Chino' },
  { value: 'online', label: 'Online' },
  { value: 'otro', label: 'Otro' },
]

const newStoreSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  type: z.enum(['supermercado', 'verduleria', 'carniceria', 'mayorista', 'chino', 'online', 'otro']),
})
type NewStoreValues = z.infer<typeof newStoreSchema>

interface Props {
  groupId: string
  value: string | null
  onChange: (store: Store | null) => void
  error?: string
}

export function StoreCombobox({ groupId, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const qc = useQueryClient()

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores', groupId],
    queryFn: () => fetchStores(groupId),
  })

  const selected = stores.find(s => s.id === value) ?? null

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<NewStoreValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(newStoreSchema) as any,
    defaultValues: { type: 'supermercado' },
  })

  const createMutation = useMutation({
    mutationFn: (v: NewStoreValues) => createStore(groupId, v.name, v.type),
    onSuccess: (store) => {
      qc.invalidateQueries({ queryKey: ['stores', groupId] })
      onChange(store)
      setDialogOpen(false)
      setOpen(false)
      reset()
      toast.success(`Comercio "${store.name}" creado`)
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
            className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', error && 'border-destructive')}
          >
            {selected ? selected.name : 'Elegí un comercio'}
            <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar comercio..." />
            <CommandList>
              {isLoading && <CommandEmpty>Cargando...</CommandEmpty>}
              {!isLoading && <CommandEmpty>No encontrado.</CommandEmpty>}
              <CommandGroup>
                {stores.map(store => (
                  <CommandItem
                    key={store.id}
                    value={store.name}
                    onSelect={() => {
                      onChange(selected?.id === store.id ? null : store)
                      setOpen(false)
                    }}
                  >
                    <Check size={14} className={cn('mr-2', selected?.id === store.id ? 'opacity-100' : 'opacity-0')} />
                    <span>{store.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{store.type}</span>
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
                  Nuevo comercio
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
            <DialogTitle>Nuevo comercio</DialogTitle>
            <DialogDescription className="sr-only">
              Crear un nuevo comercio para asociar a compras
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(v => createMutation.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nombre</Label>
              <Input id="storeName" placeholder="Coto, Día, etc." autoFocus {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="supermercado" onValueChange={v => setValue('type', v as NewStoreValues['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value ?? 'otro'}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
