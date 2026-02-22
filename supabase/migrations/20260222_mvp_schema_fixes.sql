-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: TEDA MVP Schema Fixes
-- Date: 2026-02-22
--
-- Fixes:
--   1. Add breach_reason column to accounts
--   2. Fix close_reason CHECK constraint (add 'admin_force')
--   3. Fix activity.type CHECK constraint (add 'breach')
--   4. Create payouts table + indexes + RLS
--   5. Add missing indexes
--   6. Create advance_phase_if_passed() RPC
--   7. Create breach_account_atomic() RPC
--   8. Create partial_close_atomic() RPC
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Add breach_reason column to accounts
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS breach_reason TEXT;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Fix close_reason CHECK constraint to include 'admin_force'
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Find and drop ALL CHECK constraints on positions.close_reason
  FOR r IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'public.positions'::regclass
      AND att.attname = 'close_reason'
      AND con.contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.positions DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END
$$;

-- Re-add with the expanded list
ALTER TABLE public.positions ADD CONSTRAINT positions_close_reason_check
  CHECK (close_reason IN ('manual', 'sl', 'tp', 'limit', 'liquidation', 'admin_force') OR close_reason IS NULL);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Fix activity.type CHECK constraint to include 'breach'
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'public.activity'::regclass
      AND att.attname = 'type'
      AND con.contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.activity DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END
$$;

ALTER TABLE public.activity ADD CONSTRAINT activity_type_check
  CHECK (type IN ('position', 'closed', 'order', 'challenge', 'payout', 'system', 'breach'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Create payouts table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          NUMERIC NOT NULL CHECK (amount > 0),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  method          TEXT NOT NULL DEFAULT 'crypto'
    CHECK (method IN ('crypto', 'bank', 'paypal')),
  wallet_address  TEXT,
  tx_hash         TEXT,
  admin_note      TEXT,
  requested_at    BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  processed_at    BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS payouts_account_id_idx ON public.payouts(account_id);
CREATE INDEX IF NOT EXISTS payouts_user_id_idx ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON public.payouts(status);

-- RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts: owner read" ON public.payouts;
CREATE POLICY "payouts: owner read"
  ON public.payouts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "payouts: admin all" ON public.payouts;
CREATE POLICY "payouts: admin all"
  ON public.payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Missing indexes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS accounts_user_active_idx ON public.accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS accounts_status_idx ON public.accounts(account_status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. advance_phase_if_passed() — Challenge phase transition RPC
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.advance_phase_if_passed(
  p_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account      accounts%ROWTYPE;
  v_template     challenge_templates%ROWTYPE;
  v_phase_seq    JSONB;
  v_current_idx  INT;
  v_current_rule JSONB;
  v_profit_target NUMERIC;
  v_min_days     INT;
  v_current_profit NUMERIC;
  v_trading_days  INT;
  v_total_phases  INT;
  v_next_phase    INT;
  v_next_rule     JSONB;
  v_new_status    TEXT;
BEGIN
  -- Lock account row
  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'Account not found');
  END IF;

  -- Only check active accounts
  IF v_account.account_status != 'active' THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'Account not active');
  END IF;

  -- Get challenge template
  IF v_account.challenge_template_id IS NULL THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'No challenge template');
  END IF;

  SELECT * INTO v_template
  FROM public.challenge_templates
  WHERE id = v_account.challenge_template_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'Template not found');
  END IF;

  v_phase_seq := v_template.phase_sequence;
  v_total_phases := jsonb_array_length(v_phase_seq);

  IF v_total_phases = 0 THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'Empty phase sequence');
  END IF;

  v_current_idx := GREATEST(v_account.current_phase - 1, 0);
  IF v_current_idx >= v_total_phases THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'Already past final phase');
  END IF;

  v_current_rule := v_phase_seq -> v_current_idx;
  v_profit_target := COALESCE((v_current_rule ->> 'profit_target')::NUMERIC, 0.08);
  v_min_days := COALESCE((v_current_rule ->> 'min_trading_days')::INT, 5);

  -- Calculate current profit percentage
  IF v_account.starting_balance > 0 THEN
    v_current_profit := v_account.realized_pnl / v_account.starting_balance;
  ELSE
    v_current_profit := 0;
  END IF;

  -- Count distinct trading days (days with at least one trade)
  SELECT COUNT(*) INTO v_trading_days
  FROM (
    SELECT DISTINCT DATE(to_timestamp(ts / 1000))
    FROM public.equity_history
    WHERE account_id = p_account_id AND pnl != 0
  ) sub;

  -- Check if pass conditions are met
  IF v_current_profit < v_profit_target THEN
    RETURN jsonb_build_object(
      'advanced', false,
      'reason', 'Profit target not met',
      'current_profit', ROUND(v_current_profit, 6),
      'target', v_profit_target
    );
  END IF;

  IF v_trading_days < v_min_days THEN
    RETURN jsonb_build_object(
      'advanced', false,
      'reason', 'Minimum trading days not met',
      'current_days', v_trading_days,
      'min_days', v_min_days
    );
  END IF;

  -- ── PASSED! Advance to next phase or fund ──────────────────────────────
  v_next_phase := v_account.current_phase + 1;

  IF v_next_phase > v_total_phases THEN
    -- All phases complete → FUNDED
    v_new_status := 'funded';

    UPDATE public.accounts SET
      account_status = 'funded',
      current_phase = v_next_phase,
      updated_at = now()
    WHERE id = p_account_id;

    INSERT INTO public.activity (account_id, type, title, sub, ts, pnl)
    VALUES (
      p_account_id, 'challenge',
      'Challenge Passed — Account Funded!',
      'Congratulations! You can now request payouts. Profit split: '
        || COALESCE((v_current_rule ->> 'profit_split'), '0.80')::TEXT,
      (extract(epoch from now()) * 1000)::bigint,
      v_account.realized_pnl
    );
  ELSE
    -- Advance to next phase
    v_next_rule := v_phase_seq -> (v_next_phase - 1);
    v_new_status := 'active';

    -- Reset account for next phase (same starting balance, reset PnL)
    UPDATE public.accounts SET
      current_phase = v_next_phase,
      realized_pnl = 0,
      total_pnl = 0,
      unrealized_pnl = 0,
      available_margin = starting_balance,
      reserved_margin = 0,
      total_margin_required = 0,
      net_worth = starting_balance,
      updated_at = now()
    WHERE id = p_account_id;

    INSERT INTO public.activity (account_id, type, title, sub, ts, pnl)
    VALUES (
      p_account_id, 'challenge',
      'Phase ' || v_account.current_phase || ' Passed!',
      'Advancing to Phase ' || v_next_phase || ': '
        || COALESCE(v_next_rule ->> 'phase_type', 'evaluation'),
      (extract(epoch from now()) * 1000)::bigint,
      v_account.realized_pnl
    );
  END IF;

  RETURN jsonb_build_object(
    'advanced', true,
    'new_phase', v_next_phase,
    'new_status', v_new_status,
    'profit_achieved', ROUND(v_current_profit, 6),
    'trading_days', v_trading_days
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.advance_phase_if_passed FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_phase_if_passed TO service_role;

COMMENT ON FUNCTION public.advance_phase_if_passed IS
  'Atomic phase transition: checks profit target + trading days, advances to next phase
   or marks account as funded. Resets account balances for new phase. Locks account row.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. breach_account_atomic() — Atomic account breach
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.breach_account_atomic(
  p_account_id UUID,
  p_reason     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account accounts%ROWTYPE;
BEGIN
  -- Lock account row
  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;

  IF v_account.account_status = 'breached' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already breached');
  END IF;

  -- Mark breached with reason
  UPDATE public.accounts SET
    account_status = 'breached',
    is_active = false,
    breach_reason = p_reason,
    updated_at = now()
  WHERE id = p_account_id;

  -- Activity record
  INSERT INTO public.activity (account_id, type, title, sub, ts, pnl)
  VALUES (
    p_account_id,
    'system',
    'Account Breached',
    p_reason,
    (extract(epoch from now()) * 1000)::bigint,
    NULL
  );

  RETURN jsonb_build_object('success', true, 'reason', p_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.breach_account_atomic FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.breach_account_atomic TO service_role;

COMMENT ON FUNCTION public.breach_account_atomic IS
  'Atomic account breach: locks account row, sets status to breached with reason,
   and inserts activity record. Prevents double-breach via status check.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. partial_close_atomic() — Atomic partial close
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.partial_close_atomic(
  p_position_id      UUID,
  p_account_id       UUID,
  p_close_qty        NUMERIC,       -- quantity to close
  p_exit_price       NUMERIC,
  p_partial_pnl      NUMERIC,       -- PnL for this partial close
  p_close_fee        NUMERIC,
  p_released_margin  NUMERIC,       -- margin to release back
  p_symbol           TEXT DEFAULT NULL,
  p_direction        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position    positions%ROWTYPE;
  v_account     accounts%ROWTYPE;
  v_remaining   NUMERIC;
  v_new_margin  NUMERIC;
  v_new_avail   NUMERIC;
  v_new_tmr     NUMERIC;
  v_new_rpnl    NUMERIC;
  v_new_tpnl    NUMERIC;
  v_new_nw      NUMERIC;
  v_pnl_str     TEXT;
  v_now_ts      BIGINT;
BEGIN
  v_now_ts := (extract(epoch from now()) * 1000)::bigint;

  -- Lock account
  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;

  -- Lock position
  SELECT * INTO v_position
  FROM public.positions
  WHERE id = p_position_id
    AND account_id = p_account_id
    AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Position not open');
  END IF;

  -- Validate close qty
  v_remaining := v_position.quantity - p_close_qty;
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Close qty >= position size, use full close');
  END IF;

  -- Update position: reduce qty, ACCUMULATE realized_pnl (not overwrite!)
  v_new_margin := v_position.isolated_margin - p_released_margin;

  UPDATE public.positions SET
    quantity        = v_remaining,
    isolated_margin = v_new_margin,
    realized_pnl    = realized_pnl + p_partial_pnl,  -- ACCUMULATE!
    total_fees      = total_fees + p_close_fee,
    updated_at      = NOW()
  WHERE id = p_position_id;

  -- Update account balances
  v_new_avail := v_account.available_margin + p_released_margin + p_partial_pnl - p_close_fee;
  v_new_tmr   := GREATEST(v_account.total_margin_required - p_released_margin, 0);
  v_new_rpnl  := v_account.realized_pnl + p_partial_pnl;
  v_new_tpnl  := v_account.total_pnl + p_partial_pnl;
  v_new_nw    := v_account.net_worth + p_partial_pnl - p_close_fee;

  UPDATE public.accounts SET
    available_margin      = v_new_avail,
    total_margin_required = v_new_tmr,
    realized_pnl          = v_new_rpnl,
    total_pnl             = v_new_tpnl,
    net_worth             = v_new_nw,
    updated_at            = NOW()
  WHERE id = p_account_id;

  -- Activity record
  v_pnl_str := CASE
    WHEN p_partial_pnl >= 0 THEN '+$' || ROUND(p_partial_pnl, 2)::TEXT
    ELSE '-$' || ROUND(ABS(p_partial_pnl), 2)::TEXT
  END;

  INSERT INTO public.activity (account_id, type, title, sub, ts, pnl)
  VALUES (
    p_account_id,
    'closed',
    CASE WHEN COALESCE(p_direction, v_position.direction) = 'long' THEN 'Long' ELSE 'Short' END
      || ' ' || COALESCE(p_symbol, v_position.symbol) || ' partial close',
    p_close_qty::TEXT || ' lots @ $' || ROUND(p_exit_price, 2)::TEXT || ' · ' || v_pnl_str,
    v_now_ts,
    p_partial_pnl
  );

  -- Equity history
  INSERT INTO public.equity_history (account_id, ts, equity, pnl)
  VALUES (p_account_id, v_now_ts, v_new_avail, p_partial_pnl);

  RETURN jsonb_build_object(
    'success',        true,
    'remaining_qty',  v_remaining,
    'realized_pnl',   p_partial_pnl,
    'close_fee',      p_close_fee,
    'new_balance',    v_new_nw,
    'new_avail',      v_new_avail
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.partial_close_atomic FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partial_close_atomic TO service_role;

COMMENT ON FUNCTION public.partial_close_atomic IS
  'Atomic partial position close: locks account + position rows, reduces position quantity,
   ACCUMULATES realized_pnl (not overwrite), releases proportional margin, updates account,
   and inserts activity + equity_history — all in one transaction.';
