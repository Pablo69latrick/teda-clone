-- ============================================================
-- VerticalProp Clone — Seed Data
-- Exécuter APRÈS schema.sql dans Supabase SQL Editor
-- ============================================================

-- ── 1. Instruments ────────────────────────────────────────────────────────────
insert into public.instruments (id, symbol, name, instrument_type, base_currency, margin_requirement, min_order_size, max_leverage, tick_size, lot_size, price_decimals, qty_decimals)
values
  ('BTC-USD',   'BTC-USD',   'Bitcoin',        'crypto',      'BTC',   0.01,  0.001,  20,  0.1,     0.001,  1, 3),
  ('ETH-USD',   'ETH-USD',   'Ethereum',       'crypto',      'ETH',   0.01,  0.001,  20,  0.01,    0.001,  2, 3),
  ('SOL-USD',   'SOL-USD',   'Solana',         'crypto',      'SOL',   0.01,  0.01,   20,  0.001,   0.01,   3, 3),
  ('XRP-USD',   'XRP-USD',   'Ripple',         'crypto',      'XRP',   0.01,  10,     20,  0.00001, 10,     5, 5),
  ('ADA-USD',   'ADA-USD',   'Cardano',        'crypto',      'ADA',   0.01,  10,     20,  0.0001,  10,     4, 4),
  ('DOGE-USD',  'DOGE-USD',  'Dogecoin',       'crypto',      'DOGE',  0.01,  100,    20,  0.00001, 100,    5, 5),
  ('LINK-USD',  'LINK-USD',  'Chainlink',      'crypto',      'LINK',  0.01,  1,      20,  0.0001,  1,      4, 4),
  ('ARB-USD',   'ARB-USD',   'Arbitrum',       'crypto',      'ARB',   0.01,  10,     20,  0.00001, 10,     5, 5),
  ('1INCH-USD', '1INCH-USD', '1inch',          'crypto',      '1INCH', 0.01,  100,    20,  0.00001, 100,    5, 5),
  ('AAVE-USD',  'AAVE-USD',  'Aave',           'crypto',      'AAVE',  0.01,  0.01,   20,  0.001,   0.01,   3, 3),
  ('ASTER-USD', 'ASTER-USD', 'Astar Network',  'crypto',      'ASTER', 0.01,  100,    20,  0.00001, 100,    5, 5),
  ('EUR-USD',   'EUR-USD',   'Euro / US Dollar','forex',      'EUR',   0.001, 1000,   100, 0.00001, 1000,   5, 5),
  ('GBP-USD',   'GBP-USD',   'Pound / US Dollar','forex',    'GBP',   0.001, 1000,   100, 0.00001, 1000,   5, 5),
  ('AUD-USD',   'AUD-USD',   'Aussie / US Dollar','forex',   'AUD',   0.001, 1000,   100, 0.00001, 1000,   5, 5)
on conflict (symbol) do update set
  name = excluded.name,
  instrument_type = excluded.instrument_type,
  updated_at = now();

-- ── 2. Price Cache bootstrap (sera écrasé par le cron /api/prices/update) ────
insert into public.price_cache (symbol, current_price, current_bid, current_ask, mark_price, last_updated)
values
  ('BTC-USD',   95420.50,  95419.00,  95421.00,  95420.50,  (extract(epoch from now()) * 1000)::bigint),
  ('ETH-USD',    3450.25,   3449.75,   3450.75,   3450.25,  (extract(epoch from now()) * 1000)::bigint),
  ('SOL-USD',     185.32,    185.31,    185.33,    185.32,   (extract(epoch from now()) * 1000)::bigint),
  ('XRP-USD',      2.3456,    2.3455,    2.3457,    2.3456,  (extract(epoch from now()) * 1000)::bigint),
  ('ADA-USD',      0.2738,    0.2737,    0.2739,    0.2738,  (extract(epoch from now()) * 1000)::bigint),
  ('DOGE-USD',     0.15320,   0.15318,   0.15321,   0.15320, (extract(epoch from now()) * 1000)::bigint),
  ('LINK-USD',    14.832,    14.831,    14.833,    14.832,   (extract(epoch from now()) * 1000)::bigint),
  ('ARB-USD',      0.1042,    0.10419,   0.10421,   0.1042,  (extract(epoch from now()) * 1000)::bigint),
  ('1INCH-USD',    0.09283,   0.09282,   0.09284,   0.09283, (extract(epoch from now()) * 1000)::bigint),
  ('AAVE-USD',   122.55,    122.54,    122.56,    122.55,    (extract(epoch from now()) * 1000)::bigint),
  ('ASTER-USD',    0.06917,   0.06916,   0.06918,   0.06917, (extract(epoch from now()) * 1000)::bigint),
  ('EUR-USD',      1.08432,   1.08431,   1.08433,   1.08432, (extract(epoch from now()) * 1000)::bigint),
  ('GBP-USD',      1.26750,   1.26748,   1.26752,   1.26750, (extract(epoch from now()) * 1000)::bigint),
  ('AUD-USD',      0.69584,   0.69583,   0.69585,   0.69584, (extract(epoch from now()) * 1000)::bigint)
on conflict (symbol) do update set
  current_price = excluded.current_price,
  current_bid   = excluded.current_bid,
  current_ask   = excluded.current_ask,
  mark_price    = excluded.mark_price,
  last_updated  = excluded.last_updated;

-- ── 3. Challenge Templates ────────────────────────────────────────────────────
insert into public.challenge_templates (id, name, description, starting_balance, entry_fee, is_active, status, category, phase_sequence)
values
  (
    'a1b2c3d4-0001-0001-0001-000000000001'::uuid,
    '100K Instant Funding',
    'Single-phase instant funding. Hit 10% profit with no drawdown breach.',
    100000, 549, true, 'active', 'paid',
    '[
      {
        "phase_number": 1,
        "phase_type": "evaluation",
        "name": "Phase 1",
        "profit_target": 0.10,
        "daily_loss_limit": 0.05,
        "max_drawdown": 0.10,
        "min_trading_days": 0,
        "max_trading_days": null,
        "profit_split": 0.80,
        "leverage_limit": 100,
        "news_trading_allowed": false,
        "weekend_holding_allowed": true,
        "martingale_detection_enabled": true
      }
    ]'::jsonb
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002'::uuid,
    '50K Standard 2-Step',
    'Classic two-phase evaluation. 8% target in Phase 1, 5% in Phase 2.',
    50000, 299, true, 'active', 'paid',
    '[
      {
        "phase_number": 1,
        "phase_type": "evaluation",
        "name": "Phase 1",
        "profit_target": 0.08,
        "daily_loss_limit": 0.05,
        "max_drawdown": 0.10,
        "min_trading_days": 5,
        "max_trading_days": 30,
        "profit_split": 0,
        "leverage_limit": 50,
        "news_trading_allowed": false,
        "weekend_holding_allowed": false,
        "martingale_detection_enabled": true
      },
      {
        "phase_number": 2,
        "phase_type": "evaluation",
        "name": "Phase 2",
        "profit_target": 0.05,
        "daily_loss_limit": 0.05,
        "max_drawdown": 0.10,
        "min_trading_days": 5,
        "max_trading_days": 60,
        "profit_split": 0.80,
        "leverage_limit": 50,
        "news_trading_allowed": false,
        "weekend_holding_allowed": false,
        "martingale_detection_enabled": true
      }
    ]'::jsonb
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003'::uuid,
    '200K Elite',
    'High capital, tighter rules. For experienced traders only.',
    200000, 1099, true, 'active', 'paid',
    '[
      {
        "phase_number": 1,
        "phase_type": "evaluation",
        "name": "Phase 1",
        "profit_target": 0.08,
        "daily_loss_limit": 0.04,
        "max_drawdown": 0.08,
        "min_trading_days": 10,
        "max_trading_days": 45,
        "profit_split": 0,
        "leverage_limit": 20,
        "news_trading_allowed": false,
        "weekend_holding_allowed": false,
        "martingale_detection_enabled": true
      },
      {
        "phase_number": 2,
        "phase_type": "funded",
        "name": "Funded",
        "profit_target": 0,
        "daily_loss_limit": 0.04,
        "max_drawdown": 0.08,
        "min_trading_days": 0,
        "max_trading_days": null,
        "profit_split": 0.85,
        "leverage_limit": 20,
        "news_trading_allowed": false,
        "weekend_holding_allowed": false,
        "martingale_detection_enabled": true
      }
    ]'::jsonb
  )
on conflict (id) do nothing;

-- ── 4. Compte demo (à exécuter APRÈS avoir créé un user via Supabase Auth) ────
-- IMPORTANT : remplacer 'REMPLACER_PAR_UUID_USER' par le vrai UUID de l'utilisateur
-- que vous créez dans Supabase Dashboard > Authentication > Users > "Add user"

-- insert into public.accounts (
--   id, user_id, challenge_template_id, name,
--   account_type, starting_balance, available_margin,
--   net_worth, total_pnl, realized_pnl, unrealized_pnl,
--   account_status, current_phase
-- )
-- values (
--   'f2538dee-cfb0-422a-bf7b-c6b247145b3a',
--   'REMPLACER_PAR_UUID_USER',
--   'a1b2c3d4-0003-0003-0003-000000000003',
--   'Phase 1 — Evaluation',
--   'prop', 200000, 200019.91,
--   200019.91, 19.91, 19.91, 0,
--   'active', 1
-- )
-- on conflict (id) do nothing;

-- -- Equity history 30 jours
-- insert into public.equity_history (account_id, ts, equity, pnl)
-- select
--   'f2538dee-cfb0-422a-bf7b-c6b247145b3a',
--   (extract(epoch from (now() - interval '1 day' * (30 - s)))::bigint) * 1000,
--   200000 + (random() * 600 - 200) * s / 15,
--   (random() * 600 - 200) * s / 15
-- from generate_series(1, 30) s;

-- -- Activité demo
-- insert into public.activity (account_id, type, title, sub, pnl)
-- values
--   ('f2538dee-cfb0-422a-bf7b-c6b247145b3a', 'position', 'Opened BTC-USD Long', '0.05 BTC @ $95,420', null),
--   ('f2538dee-cfb0-422a-bf7b-c6b247145b3a', 'challenge', 'Phase 1 started', '200K Elite Challenge', null),
--   ('f2538dee-cfb0-422a-bf7b-c6b247145b3a', 'closed', 'Closed ETH-USD Short', '+$142.50 profit', 142.50);
