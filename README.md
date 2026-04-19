# Super Tracker

Control de compras del supermercado, stock de la casa y reportes de gasto.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui (Radix UI)
- React Router v7
- Zustand (grupo activo, persistido en localStorage)
- TanStack Query v5
- React Hook Form + Zod v4
- Supabase (Postgres + Auth)
- date-fns con locale `es`
- Recharts
- @react-pdf/renderer

## Setup

### 1. Clonar e instalar

```bash
git clone <repo>
cd super-tracker
npm install
```

### 2. Variables de entorno

Copiá el ejemplo y completá con tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

`.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Las credenciales las encontrás en el panel de Supabase → Settings → API.

### 3. Base de datos

El schema está en `001_initial_schema.sql`. Si necesitás re-aplicarlo:

```bash
# Con Supabase CLI
supabase db push

# O pegá el contenido del SQL directamente en el SQL Editor de Supabase
```

El schema incluye:
- Tablas: `profiles`, `groups`, `group_members`, `categories`, `products`, `stores`, `purchases`, `purchase_items`, `stock_items`, `stock_movements`, `budgets`
- Triggers automáticos para stock y totales
- Row Level Security (RLS) por grupo
- Seed de categorías globales

### 4. Tipos de TypeScript (opcional)

Los tipos de DB están escritos manualmente en `src/types/database.ts`. Para regenerarlos desde el schema real:

```bash
npx supabase gen types typescript --project-id <tu-project-id> > src/types/database.ts
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Funcionalidades (Fase 1)

- **Auth**: login / signup con email+password
- **Grupos**: crear grupo o unirse con UUID; soporte multi-grupo
- **Compras**: carga manual con combobox de comercio/producto, lista dinámica de ítems, cálculo automático, totales por mes
- **Stock**: vista con búsqueda y filtros, ajuste rápido +/−, ajuste manual con razón, export PDF de faltantes
- **Reportes**: 4 tabs (resumen mensual, por comercio, top productos, por categoría) con gráficos Recharts
- **Presupuesto**: monto mensual + umbral de alerta, barra de progreso en dashboard y reportes
- **Dashboard**: resumen del mes, últimas compras, alertas de stock bajo

## Arquitectura

```
src/
├── app/          # Páginas por ruta
├── components/
│   ├── ui/       # Componentes Radix/shadcn
│   ├── forms/    # Comboboxes y dialogs de formulario
│   └── shared/   # BudgetBanner, EmptyState
├── features/     # Lógica de dominio por área
│   ├── auth/
│   ├── groups/
│   ├── products/
│   ├── stores/
│   ├── purchases/
│   ├── stock/
│   ├── budgets/
│   └── reports/
├── lib/          # supabase, queryClient, format, utils
├── stores/       # Zustand (groupStore)
├── hooks/        # useCurrentGroup, useAuth
└── types/        # database.ts (tipos de Supabase)
```

**Regla clave**: el stock nunca se actualiza manualmente desde el frontend al cargar una compra. Los triggers de la DB hacen el upsert en `stock_items` y el insert en `stock_movements` automáticamente al insertar `purchase_items`.

## Known issues / mejoras para Fase 2

- [ ] Tipos de DB generados manualmente — idealmente regenerar con `supabase gen types` cuando cambien tablas
- [ ] La paginación de `/purchases` carga los primeros 30 resultados; falta "cargar más"
- [ ] No hay edición de ítems individuales en `/purchases/:id` (solo eliminar compra completa)
- [ ] El export PDF usa `file-saver` que no funciona en iOS — workaround: `URL.createObjectURL` + tab nueva
- [ ] No hay toggle manual de modo oscuro — sigue el sistema operativo
- [ ] El signup no requiere confirmación de email por defecto — depende de la config de Supabase Auth

### Fase 2 (no implementado)

- OCR de tickets con foto (Gemini API)
- Parser de recetas y consumo de stock (Claude API)
- Modo offline / PWA / IndexedDB
- Sistema real de invitaciones a grupos (link con token)
- Meal planner y recetas
- Empaquetado mobile con Capacitor
