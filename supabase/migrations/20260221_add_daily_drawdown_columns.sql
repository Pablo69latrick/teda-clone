-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_daily_drawdown_columns
-- Adds day_start_balance, day_start_equity, day_start_date to accounts table
-- for proper daily drawdown tracking (5% limit).
--
-- The daily drawdown check compares current equity against:
--   floor = MAX(day_start_balance, day_start_equity) × (1 − 0.05)
--
-- These columns are reset automatically by the order execution handler
-- at the first request of each new trading day (UTC).
-- ─────────────────────────────────────────────────────────────────────────────

-- Add columns (nullable — handler will initialize on first use)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS day_start_balance numeric,
  ADD COLUMN IF NOT EXISTS day_start_equity  numeric,
  ADD COLUMN IF NOT EXISTS day_start_date    text;        -- ISO date 'YYYY-MM-DD' in UTC

-- Initialize for all existing accounts that have NULL values
-- Uses net_worth as initial day-start snapshot
UPDATE public.accounts
SET
  day_start_balance = COALESCE(net_worth, starting_balance),
  day_start_equity  = COALESCE(net_worth, starting_balance),
  day_start_date    = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE day_start_balance IS NULL;

-- Index for quick lookups (optional — accounts table is usually small)
-- CREATE INDEX IF NOT EXISTS idx_accounts_day_start_date ON public.accounts (day_start_date);

COMMENT ON COLUMN public.accounts.day_start_balance IS 'Account net_worth snapshot at start of trading day (UTC midnight)';
COMMENT ON COLUMN public.accounts.day_start_equity  IS 'Account equity (net_worth + unrealized PnL) snapshot at start of trading day';
COMMENT ON COLUMN public.accounts.day_start_date    IS 'ISO date string (YYYY-MM-DD) of the last daily reset';
