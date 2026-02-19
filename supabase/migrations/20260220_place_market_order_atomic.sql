-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: place_market_order_atomic
-- Fix C-06: Race condition in margin check + deduction
--
-- The previous implementation read available_margin in JavaScript, checked it,
-- then opened a position and wrote the new balance back in separate queries.
-- Two concurrent requests could both pass the margin check with the same
-- balance and open two positions — effectively overdrafting the account.
--
-- This function performs the entire market order flow inside a single
-- Postgres transaction with FOR UPDATE row-locking on the accounts row,
-- which prevents any concurrent request from reading or modifying the margin
-- until this transaction commits.
--
-- Called via: supabase.rpc('place_market_order', { ... })
-- Requires:   service role (called from API route with admin client)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.place_market_order(
  -- Identity / ownership
  p_account_id       uuid,
  p_user_id          uuid,           -- verified by API route via getUser()
  -- Instrument
  p_symbol           text,
  p_direction        text,           -- 'long' | 'short'
  p_margin_mode      text,           -- 'cross' | 'isolated'
  -- Order sizing
  p_quantity         numeric,
  p_leverage         int,
  p_exec_price       numeric,        -- bid/ask already resolved by caller
  p_margin           numeric,        -- notional / leverage, computed by caller
  p_fee              numeric,        -- notional * 0.0007, computed by caller
  p_liquidation_price numeric,
  -- Legacy text columns (instrument_config, instrument_price)
  p_instrument_config text,
  p_instrument_price  text,
  -- Optional SL / TP
  p_sl_price         numeric default null,
  p_tp_price         numeric default null
)
returns jsonb
language plpgsql
security definer                     -- runs as the function owner (superuser)
set search_path = public
as $$
declare
  v_account        accounts%rowtype;
  v_position_id    uuid;
  v_position       positions%rowtype;
  v_entry_ts       bigint;
begin
  -- ── 1. Lock the account row for the duration of this transaction ──────────
  -- FOR UPDATE prevents any concurrent transaction from reading or writing
  -- this row until we commit, eliminating the race condition.
  select * into v_account
  from public.accounts
  where id = p_account_id
    and user_id = p_user_id          -- ownership guard inside the DB
    and is_active = true
  for update;

  if not found then
    raise exception 'account_not_found'
      using hint = 'Account not found, inactive, or not owned by this user';
  end if;

  -- ── 2. Atomic margin check ────────────────────────────────────────────────
  -- This check now happens while holding the row lock — no concurrent request
  -- can sneak in between the read and the deduction.
  if p_margin > v_account.available_margin then
    raise exception 'insufficient_margin'
      using hint = 'Insufficient margin for this order';
  end if;

  -- ── 3. Insert the position ────────────────────────────────────────────────
  v_entry_ts := (extract(epoch from now()) * 1000)::bigint;

  insert into public.positions (
    account_id, symbol, instrument_config, instrument_price,
    direction, quantity, original_quantity, leverage,
    entry_price, entry_timestamp, liquidation_price,
    status, margin_mode, isolated_margin, trade_fees, total_fees
  ) values (
    p_account_id, p_symbol, p_instrument_config, p_instrument_price,
    p_direction, p_quantity, p_quantity, p_leverage,
    p_exec_price, v_entry_ts, p_liquidation_price,
    'open', p_margin_mode, p_margin, p_fee, p_fee
  )
  returning * into v_position;

  -- ── 4. Atomic margin deduction ────────────────────────────────────────────
  -- Uses a SQL expression (available_margin - p_margin) rather than the
  -- JavaScript-computed value, so the DB arithmetic is authoritative.
  update public.accounts
  set
    available_margin      = available_margin - p_margin,
    total_margin_required = total_margin_required + p_margin,
    updated_at            = now()
  where id = p_account_id;

  -- ── 5. Optional SL order ─────────────────────────────────────────────────
  if p_sl_price is not null then
    insert into public.orders (
      account_id, symbol,
      direction, order_type, quantity, leverage,
      price, stop_price, margin_mode, status, position_id, filled_quantity
    ) values (
      p_account_id, p_symbol,
      case when p_direction = 'long' then 'short' else 'long' end,
      'stop', p_quantity, p_leverage,
      null, p_sl_price, p_margin_mode, 'pending', v_position.id, 0
    );
  end if;

  -- ── 6. Optional TP order ─────────────────────────────────────────────────
  if p_tp_price is not null then
    insert into public.orders (
      account_id, symbol,
      direction, order_type, quantity, leverage,
      price, stop_price, margin_mode, status, position_id, filled_quantity
    ) values (
      p_account_id, p_symbol,
      case when p_direction = 'long' then 'short' else 'long' end,
      'limit', p_quantity, p_leverage,
      p_tp_price, null, p_margin_mode, 'pending', v_position.id, 0
    );
  end if;

  -- ── 7. Activity record ────────────────────────────────────────────────────
  insert into public.activity (account_id, type, title, sub, ts, pnl)
  values (
    p_account_id,
    'position',
    case when p_direction = 'long' then '🟢 Long ' else '🔴 Short ' end || p_symbol || ' opened',
    p_quantity::text || ' lot' || case when p_quantity != 1 then 's' else '' end
      || ' @ $' || round(p_exec_price, 2)::text
      || ' · ' || p_leverage::text || 'x',
    extract(epoch from now())::bigint * 1000,
    null
  );

  -- ── 8. Return the new position as JSON ───────────────────────────────────
  return jsonb_build_object(
    'id',                v_position.id,
    'account_id',        v_position.account_id,
    'symbol',            v_position.symbol,
    'direction',         v_position.direction,
    'quantity',          v_position.quantity,
    'leverage',          v_position.leverage,
    'entry_price',       v_position.entry_price,
    'entry_timestamp',   v_position.entry_timestamp,
    'liquidation_price', v_position.liquidation_price,
    'status',            v_position.status,
    'margin_mode',       v_position.margin_mode,
    'isolated_margin',   v_position.isolated_margin,
    'trade_fees',        v_position.trade_fees,
    'total_fees',        v_position.total_fees,
    'realized_pnl',      0,
    'created_at',        extract(epoch from v_position.created_at)::bigint * 1000,
    'updated_at',        extract(epoch from v_position.updated_at)::bigint * 1000
  );

exception
  -- Re-raise named exceptions so the caller can distinguish them
  when others then
    raise;
end;
$$;

-- Grant execute to the service role only (called from API route)
-- Anon/authenticated roles cannot call this directly.
revoke execute on function public.place_market_order from public, anon, authenticated;
grant  execute on function public.place_market_order to service_role;

comment on function public.place_market_order is
  'Atomic market order placement: locks the account row, checks margin, inserts
   position, deducts margin, and optionally creates SL/TP orders — all in one
   transaction. Fixes C-06 race condition (double-spend on concurrent orders).';
