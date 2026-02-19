-- ============================================================
-- VerticalProp Clone — Supabase Schema
-- Exécuter dans Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. Profiles (shadow table de auth.users) ─────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text not null default '',
  email               text not null default '',
  role                text not null default 'user' check (role in ('user', 'admin')),
  banned              boolean not null default false,
  ban_reason          text,
  ban_expires         timestamptz,
  two_factor_enabled  boolean not null default false,
  image_url           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Trigger : auto-créer le profil à chaque inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Instruments ────────────────────────────────────────────────────────────
create table if not exists public.instruments (
  id                  text primary key,
  symbol              text not null unique,
  name                text not null,
  instrument_type     text not null check (instrument_type in ('crypto','forex','stocks','commodities')),
  base_currency       text not null,
  quote_currency      text not null default 'USD',
  margin_requirement  numeric not null default 0.01,
  min_order_size      numeric not null,
  max_leverage        int not null default 20,
  tick_size           numeric not null,
  lot_size            numeric not null,
  price_decimals      int not null default 2,
  qty_decimals        int not null default 4,
  is_tradable         boolean not null default true,
  is_active           boolean not null default true,
  orderbook_enabled   boolean not null default false,
  trades_enabled      boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 3. Price Cache ────────────────────────────────────────────────────────────
create table if not exists public.price_cache (
  symbol              text primary key references public.instruments(symbol) on delete cascade,
  current_price       numeric not null,
  current_bid         numeric,
  current_ask         numeric,
  mark_price          numeric,
  funding_rate        numeric default -0.0002,
  next_funding_time   bigint,
  last_updated        bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- ── 4. Challenge Templates ────────────────────────────────────────────────────
create table if not exists public.challenge_templates (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  description      text,
  starting_balance numeric not null,
  base_currency    text not null default 'USD',
  entry_fee        numeric not null default 0,
  is_active        boolean not null default true,
  status           text not null default 'active' check (status in ('active','paused','archived')),
  category         text not null default 'paid' check (category in ('free_trial','paid')),
  phase_sequence   jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── 5. Accounts ───────────────────────────────────────────────────────────────
create table if not exists public.accounts (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  challenge_template_id   uuid references public.challenge_templates(id),
  name                    text not null,
  account_type            text not null default 'prop' check (account_type in ('prop','live','demo')),
  account_type_config     text,
  base_currency           text not null default 'USD',
  default_margin_mode     text not null default 'cross' check (default_margin_mode in ('cross','isolated')),
  starting_balance        numeric not null default 200000,
  available_margin        numeric not null default 200000,
  reserved_margin         numeric not null default 0,
  total_margin_required   numeric not null default 0,
  injected_funds          numeric not null default 0,
  net_worth               numeric not null default 200000,
  total_pnl               numeric not null default 0,
  unrealized_pnl          numeric not null default 0,
  realized_pnl            numeric not null default 0,
  is_active               boolean not null default true,
  is_closed               boolean not null default false,
  account_status          text not null default 'active'
    check (account_status in ('active','breached','passed','funded','closed')),
  current_phase           int not null default 1,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);

-- ── 6. Positions ──────────────────────────────────────────────────────────────
create table if not exists public.positions (
  id                  uuid primary key default uuid_generate_v4(),
  account_id          uuid not null references public.accounts(id) on delete cascade,
  symbol              text not null references public.instruments(symbol),
  instrument_config   text not null,
  instrument_price    text not null,
  direction           text not null check (direction in ('long','short')),
  quantity            numeric not null,
  leverage            int not null default 1,
  entry_price         numeric not null,
  entry_timestamp     bigint not null,
  exit_price          numeric,
  exit_timestamp      bigint,
  liquidation_price   numeric,
  status              text not null default 'open' check (status in ('open','closed')),
  close_reason        text check (close_reason in ('manual','sl','tp','limit','liquidation') or close_reason is null),
  margin_mode         text not null default 'cross' check (margin_mode in ('cross','isolated')),
  isolated_margin     numeric not null default 0,
  isolated_wallet     numeric,
  realized_pnl        numeric not null default 0,
  trade_fees          numeric not null default 0,
  overnight_fees      numeric not null default 0,
  funding_fees        numeric not null default 0,
  total_fees          numeric not null default 0,
  total_funding       numeric not null default 0,
  linked_orders       jsonb,
  original_quantity   numeric,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists positions_account_id_idx on public.positions(account_id);
create index if not exists positions_account_status_idx on public.positions(account_id, status);

-- ── 7. Orders ─────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id               uuid primary key default uuid_generate_v4(),
  account_id       uuid not null references public.accounts(id) on delete cascade,
  symbol           text not null references public.instruments(symbol),
  direction        text not null check (direction in ('long','short')),
  order_type       text not null check (order_type in ('market','limit','stop','stop_limit')),
  quantity         numeric not null,
  leverage         int not null default 1,
  price            numeric,
  stop_price       numeric,
  sl_price         numeric,
  tp_price         numeric,
  status           text not null default 'pending'
    check (status in ('pending','partial','filled','cancelled')),
  margin_mode      text not null default 'cross' check (margin_mode in ('cross','isolated')),
  position_id      uuid references public.positions(id),
  filled_quantity  numeric not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_account_status_idx on public.orders(account_id, status);

-- ── 8. Equity History ─────────────────────────────────────────────────────────
create table if not exists public.equity_history (
  id          bigint generated always as identity primary key,
  account_id  uuid not null references public.accounts(id) on delete cascade,
  ts          bigint not null,
  equity      numeric not null,
  pnl         numeric not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists equity_history_account_ts_idx on public.equity_history(account_id, ts desc);

-- ── 9. Activity Feed ──────────────────────────────────────────────────────────
create table if not exists public.activity (
  id          uuid primary key default uuid_generate_v4(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  type        text not null check (type in ('position','closed','order','challenge','payout','system')),
  title       text not null,
  sub         text not null,
  ts          bigint not null default (extract(epoch from now()) * 1000)::bigint,
  pnl         numeric,
  created_at  timestamptz not null default now()
);

create index if not exists activity_account_ts_idx on public.activity(account_id, ts desc);

-- ── 10. Leaderboard View ──────────────────────────────────────────────────────
create or replace view public.leaderboard_view as
select
  row_number() over (order by a.realized_pnl desc) as rank,
  a.id as account_id,
  p.id as user_id,
  coalesce(p.name, split_part(p.email, '@', 1)) as username,
  p.image_url as avatar_url,
  case
    when a.starting_balance > 0
    then round((a.realized_pnl / a.starting_balance * 100)::numeric, 2)
    else 0
  end as profit_pct,
  a.realized_pnl as profit_amount,
  (
    select count(*)::int
    from public.equity_history eh
    where eh.account_id = a.id and eh.pnl != 0
  ) as trading_days,
  coalesce(ct.name, 'Standard') as challenge_name,
  (a.account_status = 'funded') as is_funded
from public.accounts a
join public.profiles p on p.id = a.user_id
left join public.challenge_templates ct on ct.id = a.challenge_template_id
where a.is_active = true
order by a.realized_pnl desc
limit 100;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.positions enable row level security;
alter table public.orders enable row level security;
alter table public.equity_history enable row level security;
alter table public.activity enable row level security;
alter table public.instruments enable row level security;
alter table public.price_cache enable row level security;
alter table public.challenge_templates enable row level security;

-- ── Profiles ──────────────────────────────────────────────────────────────────
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

-- ── Accounts ──────────────────────────────────────────────────────────────────
drop policy if exists "accounts: owner read" on public.accounts;
create policy "accounts: owner read"
  on public.accounts for select
  using (user_id = auth.uid());

drop policy if exists "accounts: admin read all" on public.accounts;
create policy "accounts: admin read all"
  on public.accounts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Positions ─────────────────────────────────────────────────────────────────
drop policy if exists "positions: owner read" on public.positions;
create policy "positions: owner read"
  on public.positions for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "positions: admin all" on public.positions;
create policy "positions: admin all"
  on public.positions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Orders ────────────────────────────────────────────────────────────────────
drop policy if exists "orders: owner read" on public.orders;
create policy "orders: owner read"
  on public.orders for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "orders: admin all" on public.orders;
create policy "orders: admin all"
  on public.orders for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Equity History & Activity ─────────────────────────────────────────────────
drop policy if exists "equity_history: owner read" on public.equity_history;
create policy "equity_history: owner read"
  on public.equity_history for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "activity: owner read" on public.activity;
create policy "activity: owner read"
  on public.activity for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

-- ── Public read-only tables ───────────────────────────────────────────────────
drop policy if exists "instruments: public read" on public.instruments;
create policy "instruments: public read"
  on public.instruments for select using (true);

drop policy if exists "price_cache: public read" on public.price_cache;
create policy "price_cache: public read"
  on public.price_cache for select using (true);

drop policy if exists "challenge_templates: public read" on public.challenge_templates;
create policy "challenge_templates: public read"
  on public.challenge_templates for select using (is_active = true);

drop policy if exists "challenge_templates: admin all" on public.challenge_templates;
create policy "challenge_templates: admin all"
  on public.challenge_templates for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
