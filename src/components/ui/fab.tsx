import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
}

export function Fab({ icon, label, className, ...props }: FabProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all',
        className,
      )}
      {...props}
    >
      {icon}
      {label}
    </button>
  )
}
