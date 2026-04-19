import { BarChart3 } from 'lucide-react'

interface Props {
  icon?: React.ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        {icon ?? <BarChart3 size={24} className="text-muted-foreground" />}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  )
}
