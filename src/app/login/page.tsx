import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signUp } from '@/features/auth/authService'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const signupSchema = loginSchema.extend({
  displayName: z.string().min(2, 'Mínimo 2 caracteres').max(50),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignupValues>({
    resolver: zodResolver(mode === 'login' ? loginSchema : signupSchema),
  })

  async function onSubmit(values: SignupValues) {
    try {
      if (mode === 'login') {
        const { user } = await signIn(values.email, values.password)
        if (user) navigate('/groups')
      } else {
        const { user } = await signUp(values.email, values.password, values.displayName)
        if (user) {
          toast.success('Cuenta creada. Revisá tu email para confirmar.')
          navigate('/groups')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      if (msg.includes('Invalid login credentials')) {
        toast.error('Email o contraseña incorrectos')
      } else if (msg.includes('already registered')) {
        toast.error('Ya existe una cuenta con ese email')
      } else {
        toast.error(msg)
      }
    }
  }

  function toggleMode() {
    setMode(m => (m === 'login' ? 'signup' : 'login'))
    reset()
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShoppingCart size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Super Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta gratis'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre</Label>
              <Input
                id="displayName"
                placeholder="Tu nombre"
                autoComplete="name"
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vos@ejemplo.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
            {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="text-primary font-medium hover:underline"
          >
            {mode === 'login' ? 'Registrate' : 'Ingresá'}
          </button>
        </p>
      </div>
    </div>
  )
}
