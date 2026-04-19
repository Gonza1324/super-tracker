import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, LogIn, ChevronRight, Users, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { useAuth } from '@/features/auth/useAuth'
import { signOut } from '@/features/auth/authService'
import {
  fetchUserGroups,
  createGroup,
  joinGroup,
  type GroupWithRole,
} from '@/features/groups/groupsService'

const createSchema = z.object({ name: z.string().min(2, 'Mínimo 2 caracteres').max(60) })
const joinSchema = z.object({ code: z.string().uuid('Ingresá un UUID de grupo válido') })

type CreateValues = z.infer<typeof createSchema>
type JoinValues = z.infer<typeof joinSchema>

export function GroupsPage() {
  const [panel, setPanel] = useState<'list' | 'create' | 'join'>('list')
  const navigate = useNavigate()
  const { setCurrentGroup } = useCurrentGroup()
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['user-groups'],
    queryFn: fetchUserGroups,
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) => createGroup(values.name),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ['user-groups'] })
      selectGroup(group.id, group.name)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const joinMutation = useMutation({
    mutationFn: (values: JoinValues) => joinGroup(values.code),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ['user-groups'] })
      selectGroup(group.id, group.name)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema) })
  const joinForm = useForm<JoinValues>({ resolver: zodResolver(joinSchema) })

  function selectGroup(id: string, name: string) {
    setCurrentGroup(id, name)
    navigate('/')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const hasGroups = (groups?.length ?? 0) > 0

  return (
    <div className="min-h-svh flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShoppingCart size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">
              {hasGroups ? 'Elegí un grupo' : 'Empezá acá'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasGroups
                ? 'Seleccioná el grupo con el que querés trabajar'
                : 'Creá tu primer grupo o unite a uno existente'}
            </p>
          </div>
        </div>

        {/* Existing groups */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && hasGroups && panel === 'list' && (
          <div className="space-y-2">
            {groups!.map((g: GroupWithRole) => (
              <button
                key={g.id}
                onClick={() => selectGroup(g.id, g.name)}
                className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{g.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{g.role}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Create / Join panels */}
        {panel === 'list' && (
          <>
            {hasGroups && <Separator />}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setPanel('create')}
              >
                <Plus size={16} />
                Crear nuevo grupo
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => setPanel('join')}
              >
                <LogIn size={16} />
                Unirme a un grupo existente
              </Button>
            </div>
          </>
        )}

        {panel === 'create' && (
          <form onSubmit={createForm.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Nombre del grupo</Label>
              <Input
                id="groupName"
                placeholder="Mi casa"
                autoFocus
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPanel('list')}>
                Volver
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                Crear
              </Button>
            </div>
          </form>
        )}

        {panel === 'join' && (
          <form onSubmit={joinForm.handleSubmit(v => joinMutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código del grupo</Label>
              <Input
                id="code"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoFocus
                {...joinForm.register('code')}
              />
              <p className="text-xs text-muted-foreground">
                Pedile el UUID del grupo a quien lo creó.
              </p>
              {joinForm.formState.errors.code && (
                <p className="text-xs text-destructive">{joinForm.formState.errors.code.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPanel('list')}>
                Volver
              </Button>
              <Button type="submit" className="flex-1" disabled={joinMutation.isPending}>
                {joinMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                Unirme
              </Button>
            </div>
          </form>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
