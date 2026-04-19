-- =====================================================================
-- SUPER TRACKER - Schema inicial (Fase 1: Compras + Stock + Reportes)
-- =====================================================================

-- --------- EXTENSIONES ---------
create extension if not exists "uuid-ossp";

-- =====================================================================
-- TABLAS CORE
-- =====================================================================

-- Perfiles de usuario (extiende auth.users de Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- Grupos (ej. "Casa de Gonza y pareja")
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- Membresía: quién pertenece a qué grupo
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Categorías de productos
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade, -- null = global/sistema
  name text not null,
  icon text,
  color text,
  sort_order int default 0
);

-- Productos (catálogo)
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade, -- null = global
  name text not null,
  brand text,
  category_id uuid references public.categories(id),
  default_unit text default 'un', -- 'un', 'kg', 'g', 'l', 'ml'
  barcode text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index on public.products (group_id);
create index on public.products (category_id);

-- Comercios
create table public.stores (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  type text default 'supermercado' check (
    type in ('supermercado','verduleria','carniceria','mayorista','chino','online','otro')
  ),
  created_at timestamptz default now()
);

create index on public.stores (group_id);

-- =====================================================================
-- COMPRAS
-- =====================================================================

-- Una compra = un ticket
create table public.purchases (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  store_id uuid references public.stores(id),
  purchase_date date not null default current_date,
  total numeric(12,2) not null default 0,
  receipt_photo_url text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index on public.purchases (group_id, purchase_date desc);

-- Cada ítem de una compra
create table public.purchase_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null default 'un',
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null,
  created_at timestamptz default now()
);

create index on public.purchase_items (purchase_id);
create index on public.purchase_items (product_id);

-- =====================================================================
-- STOCK
-- =====================================================================

-- Stock actual (una fila por producto por grupo)
create table public.stock_items (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(10,3) not null default 0,
  unit text not null default 'un',
  min_quantity numeric(10,3) default 0, -- umbral para "se está acabando"
  updated_at timestamptz default now(),
  unique (group_id, product_id)
);

create index on public.stock_items (group_id);

-- Log de movimientos de stock (auditoría + base para reportes de consumo)
create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  product_id uuid not null references public.products(id),
  type text not null check (type in (
    'purchase','manual_add','manual_remove','recipe_consumed','cooked_meal','waste'
  )),
  quantity_delta numeric(10,3) not null, -- positivo entra, negativo sale
  unit text not null,
  ref_table text, -- 'purchases', 'recipes', etc.
  ref_id uuid,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index on public.stock_movements (group_id, created_at desc);
create index on public.stock_movements (product_id);

-- =====================================================================
-- PRESUPUESTO
-- =====================================================================

create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  month date not null, -- primer día del mes (YYYY-MM-01)
  amount numeric(12,2) not null,
  alert_threshold numeric(5,2) default 0.8, -- alerta al 80%
  created_at timestamptz default now(),
  unique (group_id, month)
);

-- =====================================================================
-- FUNCIÓN HELPER: ¿el usuario actual pertenece al grupo?
-- =====================================================================
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stores enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.budgets enable row level security;

-- profiles: cada uno el suyo
create policy "profiles_own" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- groups: los ves si sos miembro
create policy "groups_member_select" on public.groups
  for select using (public.is_group_member(id));
create policy "groups_insert_authenticated" on public.groups
  for insert with check (auth.uid() = created_by);
create policy "groups_owner_update" on public.groups
  for update using (
    exists (select 1 from public.group_members
            where group_id = groups.id and user_id = auth.uid() and role = 'owner')
  );

-- group_members: los ves si estás en el grupo
create policy "members_select" on public.group_members
  for select using (public.is_group_member(group_id) or user_id = auth.uid());
create policy "members_insert_owner" on public.group_members
  for insert with check (
    -- alta inicial permitida si te sumás vos como owner
    user_id = auth.uid()
    or exists (select 1 from public.group_members gm
               where gm.group_id = group_members.group_id
                 and gm.user_id = auth.uid() and gm.role = 'owner')
  );
create policy "members_delete_owner" on public.group_members
  for delete using (
    exists (select 1 from public.group_members gm
            where gm.group_id = group_members.group_id
              and gm.user_id = auth.uid() and gm.role = 'owner')
    or user_id = auth.uid() -- podés salirte vos mismo
  );

-- Policy genérica para todas las tablas "de grupo"
create policy "categories_group" on public.categories
  for all using (group_id is null or public.is_group_member(group_id))
  with check (group_id is null or public.is_group_member(group_id));

create policy "products_group" on public.products
  for all using (group_id is null or public.is_group_member(group_id))
  with check (group_id is null or public.is_group_member(group_id));

create policy "stores_group" on public.stores
  for all using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "purchases_group" on public.purchases
  for all using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "purchase_items_group" on public.purchase_items
  for all using (
    exists (select 1 from public.purchases p
            where p.id = purchase_items.purchase_id
              and public.is_group_member(p.group_id))
  )
  with check (
    exists (select 1 from public.purchases p
            where p.id = purchase_items.purchase_id
              and public.is_group_member(p.group_id))
  );

create policy "stock_items_group" on public.stock_items
  for all using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "stock_movements_group" on public.stock_movements
  for all using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "budgets_group" on public.budgets
  for all using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- =====================================================================
-- TRIGGER: al crear un perfil nuevo, se inserta automáticamente
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- TRIGGER: actualizar stock automáticamente al agregar/borrar purchase_items
-- =====================================================================
create or replace function public.apply_purchase_to_stock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_group_id uuid;
begin
  if tg_op = 'INSERT' then
    select group_id into v_group_id from public.purchases where id = new.purchase_id;

    -- upsert al stock
    insert into public.stock_items (group_id, product_id, quantity, unit)
    values (v_group_id, new.product_id, new.quantity, new.unit)
    on conflict (group_id, product_id)
    do update set
      quantity = public.stock_items.quantity + new.quantity,
      updated_at = now();

    -- registrar el movimiento
    insert into public.stock_movements (group_id, product_id, type, quantity_delta, unit, ref_table, ref_id, created_by)
    values (v_group_id, new.product_id, 'purchase', new.quantity, new.unit, 'purchases', new.purchase_id, auth.uid());

    return new;

  elsif tg_op = 'DELETE' then
    select group_id into v_group_id from public.purchases where id = old.purchase_id;

    update public.stock_items
    set quantity = greatest(0, quantity - old.quantity), updated_at = now()
    where group_id = v_group_id and product_id = old.product_id;

    insert into public.stock_movements (group_id, product_id, type, quantity_delta, unit, ref_table, ref_id, notes, created_by)
    values (v_group_id, old.product_id, 'purchase', -old.quantity, old.unit, 'purchases', old.purchase_id, 'reversal (item deleted)', auth.uid());

    return old;
  end if;
  return null;
end;
$$;

create trigger trg_purchase_items_stock
  after insert or delete on public.purchase_items
  for each row execute function public.apply_purchase_to_stock();

-- =====================================================================
-- TRIGGER: recalcular total de la compra al cambiar purchase_items
-- =====================================================================
create or replace function public.recalc_purchase_total()
returns trigger
language plpgsql
as $$
declare
  v_purchase_id uuid;
begin
  v_purchase_id := coalesce(new.purchase_id, old.purchase_id);
  update public.purchases
  set total = coalesce((select sum(total) from public.purchase_items where purchase_id = v_purchase_id), 0)
  where id = v_purchase_id;
  return null;
end;
$$;

create trigger trg_purchase_items_recalc
  after insert or update or delete on public.purchase_items
  for each row execute function public.recalc_purchase_total();

-- =====================================================================
-- SEED: categorías por defecto (globales, group_id = null)
-- =====================================================================
insert into public.categories (name, icon, sort_order) values
  ('Almacén', '🥫', 1),
  ('Lácteos', '🥛', 2),
  ('Carnicería', '🥩', 3),
  ('Verdulería', '🥬', 4),
  ('Panadería', '🍞', 5),
  ('Bebidas', '🥤', 6),
  ('Congelados', '🧊', 7),
  ('Limpieza', '🧼', 8),
  ('Higiene personal', '🧴', 9),
  ('Mascotas', '🐾', 10),
  ('Otros', '📦', 99);
