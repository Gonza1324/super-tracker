import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ShoppingCart, Package, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentGroup } from '@/hooks/useCurrentGroup'

const navItems = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/purchases', label: 'Compras', icon: ShoppingCart, end: false },
  { to: '/stock', label: 'Stock', icon: Package, end: false },
  { to: '/reports', label: 'Reportes', icon: BarChart3, end: false },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { currentGroupName } = useCurrentGroup()

  return (
    <div className="flex flex-col min-h-svh bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto w-full">
          <span className="font-semibold text-sm text-foreground truncate">
            {currentGroupName ?? 'Super Tracker'}
          </span>
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
