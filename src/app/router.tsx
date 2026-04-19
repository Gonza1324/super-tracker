import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/app/layout'
import { ProtectedRoute, AuthRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/app/login/page'
import { GroupsPage } from '@/app/groups/page'
import { DashboardPage } from '@/app/dashboard/page'
import { PurchasesPage } from '@/app/purchases/page'
import { NewPurchasePage } from '@/app/purchases/new'
import { PurchaseDetailPage } from '@/app/purchases/detail'
import { StockPage } from '@/app/stock/page'
import { ReportsPage } from '@/app/reports/page'
import { SettingsPage } from '@/app/settings/page'

export const router = createBrowserRouter([
  {
    element: <AuthRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    path: '/groups',
    element: <GroupsPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/purchases', element: <PurchasesPage /> },
          { path: '/purchases/new', element: <NewPurchasePage /> },
          { path: '/purchases/:id', element: <PurchaseDetailPage /> },
          { path: '/stock', element: <StockPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
