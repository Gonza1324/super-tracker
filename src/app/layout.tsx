import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Home, ShoppingCart, Package, BarChart3, Settings, ChevronDown, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fetchUserGroups } from '@/features/groups/groupsService'

const navItems = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/purchases', label: 'Compras', icon: ShoppingCart, end: false },
  { to: '/stock', label: 'Stock', icon: Package, end: false },
  { to: '/reports', label: 'Reportes', icon: BarChart3, end: false },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { currentGroupId, currentGroupName, setCurrentGroup } = useCurrentGroup()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups'],
    queryFn: fetchUserGroups,
    enabled: !!currentGroupId,
  })

  return (
    <div className="flex flex-col min-h-svh bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto w-full">
          {currentGroupId ? (
            <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 -ml-1 px-2 py-1 rounded-md hover:bg-accent transition-colors min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {currentGroupName}
                  </span>
                  <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1">
                <div className="space-y-0.5">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setCurrentGroup(g.id, g.name)
                        setSwitcherOpen(false)
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <span className="truncate text-left">{g.name}</span>
                      {g.id === currentGroupId && <Check size={14} className="text-primary shrink-0" />}
                    </button>
                  ))}
                  <div className="my-1 border-t" />
                  <button
                    onClick={() => {
                      setSwitcherOpen(false)
                      navigate('/groups')
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Plus size={14} />
                    Administrar grupos
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="font-semibold text-sm text-foreground truncate">Super Tracker</span>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Configuración"
          >
            <Settings size={20} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full pb-20 px-4">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex max-w-2xl mx-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
