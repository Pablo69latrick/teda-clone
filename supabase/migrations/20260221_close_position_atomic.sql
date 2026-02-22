-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: close_position_atomic
-- Atomic position closure with FOR UPDATE row locking.
--
-- Prevents race conditions when:
--   - The engine closes a SL while the trader clicks "Close" manually
--   - Two engine cycles overlap
--   - Drawdown check and SL check try to close the same position
--
-- Called via: supabase.rpc('close_position_atomic', { ... })
-- Requires:  service role (called from execution engine or API route)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.close_position_atomic(
  -- Position identity
  p_position_id        UUID,
  p_account_id         UUID,
  -- Exit details
  p_exit_price         NUMERIC,
  p_exit_timestamp     BIGINT,
  -- Computed financials (Decimal.js in caller)
  p_realized_pnl       NUMERIC,
  p_close_fee          NUMERIC,
  p_existing_fees      NUMERIC,       -- position.trade_fees (entry fee)
  p_isolated_margin    NUMERIC,       -- margin to release
  -- Reason
  p_close_reason       TEXT,          -- 'sl', 'tp', 'liquidation', 'manual'
  -- Optional: mark a specific SL/TP order as 'filled'
  p_triggered_order_id UUID DEFAULT NULL,
  -- For activity record
  p_symbol             TEXT DEFAULT NULL,
  p_direction          TEXT DEFAULT NULL,
  p_quantity           NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position    positions%ROWTYPE;
  v_account     accounts%ROWTYPE;
  v_new_avail   NUMERIC;
  v_new_tmr     NUMERIC;
  v_new_rpnl    NUMERIC;
  v_new_tpnl    NUMERIC;
  v_new_nw      NUMERIC;
  v_total_fees  NUMERIC;
  v_pnl_str     TEXT;
  v_reason_lbl  TEXT;
BEGIN
  -- ── 1. Lock the account row ─────────────────────────────────────────────
  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;

  -- ── 2. Lock and verify the position ─────────────────────────────────────
  SELECT * INTO v_position
  FROM public.positions
  WHERE id = p_position_id
    AND account_id = p_account_id
    AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Position already closed (race condition) — return gracefully
    RETURN jsonb_build_object('success', false, 'error', 'Position not open or not found');
  END IF;

  -- ── 3. Close the position ──────────────────────────────────────────────
  v_total_fees := p_existing_fees + p_close_fee;

  UPDATE public.positions SET
    status         = 'closed',
    close_reason   = p_close_reason,
    exit_price     = p_exit_price,
    exit_timestamp = p_exit_timestamp,
    realized_pnl   = p_realized_pnl,
    total_fees     = v_total_fees,
    updated_at     = NOW()
  WHERE id = p_position_id;

  -- ── 4. Mark the triggered SL/TP order as 'filled' ─────────────────────
  IF p_triggered_order_id IS NOT NULL THEN
    UPDATE public.orders SET
      status     = 'filled',
      updated_at = NOW()
    WHERE id = p_triggered_order_id
      AND status = 'pending';
  END IF;

  -- ── 5. Cancel all remaining pending orders linked to this position ─────
  UPDATE public.orders SET
    status     = 'cancelled',
    updated_at = NOW()
  WHERE position_id = p_position_id
    AND status = 'pending';

  -- ── 6. Update account balances ─────────────────────────────────────────
  v_new_avail := v_account.available_margin + p_isolated_margin + p_realized_pnl - p_close_fee;
  v_new_tmr   := GREATEST(v_account.total_margin_required - p_isolated_margin, 0);
  v_new_rpnl  := v_account.realized_pnl + p_realized_pnl;
  v_new_tpnl  := v_account.total_pnl + p_realized_pnl;
  v_new_nw    := v_account.net_worth + p_realized_pnl - p_close_fee;

  UPDATE public.accounts SET
    available_margin      = v_new_avail,
    total_margin_required = v_new_tmr,
    realized_pnl          = v_new_rpnl,
    total_pnl             = v_new_tpnl,
    net_worth             = v_new_nw,
    updated_at            = NOW()
  WHERE id = p_account_id;

  -- ── 7. Activity record ─────────────────────────────────────────────────
  v_reason_lbl := CASE p_close_reason
    WHEN 'sl'          THEN '🛑 SL'
    WHEN 'tp'          THEN '🎯 TP'
    WHEN 'liquidation' THEN '⚠️ Liquidation'
    ELSE                    '📋 Closed'
  END;

  v_pnl_str := CASE
    WHEN p_realized_pnl >= 0 THEN '+$' || ROUND(p_realized_pnl, 2)::TEXT
    ELSE '-$' || ROUND(ABS(p_realized_pnl), 2)::TEXT
  END;

  INSERT INTO public.activity (account_id, type, title, sub, ts, pnl)
  VALUES (
    p_account_id,
    'closed',
    v_reason_lbl || ' '
      || CASE WHEN COALESCE(p_direction, v_position.direction) = 'long' THEN 'Long' ELSE 'Short' END
      || ' '
      || COALESCE(p_symbol, v_position.symbol),
    COALESCE(p_quantity, v_position.quantity)::TEXT
      || ' @ $' || ROUND(p_exit_price, 2)::TEXT
      || ' · ' || v_pnl_str,
    p_exit_timestamp,
    p_realized_pnl
  );

  -- ── 8. Equity history snapshot ─────────────────────────────────────────
  INSERT INTO public.equity_history (account_id, ts, equity, pnl)
  VALUES (
    p_account_id,
    p_exit_timestamp,
    v_new_avail,
    p_realized_pnl
  );

  -- ── 9. Return success ──────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',     true,
    'pnl',         p_realized_pnl,
    'close_fee',   p_close_fee,
    'new_balance',  v_new_nw,
    'new_avail',   v_new_avail
  );
END;
$$;

-- Grant execute to service role only
REVOKE EXECUTE ON FUNCTION public.close_position_atomic FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.close_position_atomic TO service_role;

COMMENT ON FUNCTION public.close_position_atomic IS
  'Atomic position closure: locks account + position rows (FOR UPDATE), closes position,
   marks triggered order as filled, cancels remaining orders, updates account balances,
   and inserts activity + equity_history — all in one transaction.
   Called by the Execution Engine and API routes.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Index for open positions (used by engine every second)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_positions_status_open
  ON public.positions(status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_orders_pending_position
  ON public.orders(position_id, status) WHERE status = 'pending';
