# Audit Architectural Complet — VerticalProp Clone

> **Date** : 2026-02-21
> **Codebase** : `/Users/julesrenesson/Sites/verticalprop-clone`
> **Repo** : `https://github.com/Pablo69latrick/teda-clone.git`

---

## 1. STACK TECHNIQUE

### Framework Frontend
- **Next.js 16.1.6** — App Router (`src/app/`)
- **React 19.2.3** + **React DOM 19.2.3**
- **TypeScript ^5** — strict mode activé (`tsconfig.json`)

### Framework Backend
- **Next.js API Routes** (serverless functions) — pas de backend séparé
- Pas de NestJS, Express, Go ni Python
- Les handlers vivent dans `src/app/api/proxy/handlers/`

### Base de données
- **Supabase PostgreSQL** (cloud hébergé)
- **Pas de Redis, MongoDB ni SQLite**
- Stockage en mémoire pour le cache de prix Binance (`globalThis.__binancePrices`)

### ORM / Query Builder
- **Aucun ORM** (pas de Prisma, Drizzle, TypeORM, Knex)
- Requêtes directes via `@supabase/supabase-js` SDK (PostgREST)
- 1 fonction RPC PL/pgSQL : `place_market_order` (atomic, `SECURITY DEFINER`)

### Package Manager
- **npm** (lockfile : `package-lock.json`)

### Dépendances complètes (depuis `package.json`)

**Production (29 packages)**:

| Package | Version | Rôle |
|---------|---------|------|
| `next` | 16.1.6 | Framework fullstack |
| `react` | 19.2.3 | UI library |
| `react-dom` | 19.2.3 | DOM renderer |
| `typescript` | ^5 | Typage statique |
| `@supabase/ssr` | ^0.8.0 | Supabase SSR client |
| `@supabase/supabase-js` | ^2.97.0 | Supabase JS SDK |
| `swr` | ^2.4.0 | Data fetching / cache |
| `better-auth` | ^1.4.18 | Auth framework |
| `centrifuge` | ^5.5.3 | WebSocket client (Centrifugo) |
| `lightweight-charts` | ^5.1.0 | TradingView-style charts |
| `recharts` | ^3.7.0 | React charts (dashboard) |
| `react-resizable-panels` | ^4.6.4 | Resizable panels |
| `framer-motion` | ^12.34.2 | Animations |
| `sonner` | ^2.0.7 | Toast notifications |
| `html-to-image` | ^1.11.13 | Screenshot export |
| `axios` | ^1.13.5 | HTTP client |
| `date-fns` | ^4.1.0 | Date utilities |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities Tailwind |
| `next-themes` | ^0.4.6 | Dark/light mode |
| `class-variance-authority` | ^0.7.1 | Variant system (shadcn) |
| `clsx` | ^2.1.1 | Conditional classNames |
| `tailwind-merge` | ^3.5.0 | Merge Tailwind classes |
| `lucide-react` | ^0.574.0 | Icons |
| `@radix-ui/react-*` | ^1-2 | 13 composants Radix UI headless |

**Dev (8 packages)**:

| Package | Version | Rôle |
|---------|---------|------|
| `tailwindcss` | ^4 | CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS plugin |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.1.6 | Rules Next.js |
| `@types/node` | ^20 | Types Node.js |
| `@types/react` | ^19 | Types React |
| `@types/react-dom` | ^19 | Types React DOM |
| `pg` | ^8.18.0 | PostgreSQL client |

---

## 2. ARCHITECTURE GLOBALE

### Structure : Monorepo Next.js (App Router)

```
verticalprop-clone/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth pages (login, register, forgot-password, reset-password)
│   │   ├── api/                      # API Routes
│   │   │   ├── proxy/[...path]/      # Proxy dispatcher → handlers
│   │   │   │   ├── route.ts          # Single entry point (GET/POST/PUT/PATCH/DELETE)
│   │   │   │   └── handlers/
│   │   │   │       ├── auth.ts       # auth/get-session
│   │   │   │       ├── engine-read.ts # engine/trading-data, positions, orders, etc.
│   │   │   │       ├── engine-write.ts # engine/orders, close-position, partial-close, etc.
│   │   │   │       ├── admin.ts      # admin/users, accounts, payouts, etc.
│   │   │   │       ├── settings.ts   # settings/update-profile, change-password
│   │   │   │       ├── mock.ts       # Fallback mock data
│   │   │   │       └── shared.ts     # Timestamp helpers, symbol maps
│   │   │   └── prices/
│   │   │       ├── stream/route.ts   # SSE endpoint (500ms ticks)
│   │   │       └── update/route.ts   # Cron endpoint (1min)
│   │   ├── dashboard/                # 11 dashboard pages
│   │   │   ├── overview/, analytics/, history/, leaderboard/
│   │   │   ├── calendar/, competitions/, affiliate/, payouts/, settings/
│   │   │   └── admin/god-mode/ (5 admin panels)
│   │   ├── trade/                    # Page de trading
│   │   │   ├── layout.tsx            # Trading layout
│   │   │   └── page.tsx              # Trading page (chart + watchlist + order + bottom)
│   │   └── layout.tsx, page.tsx      # Root layout + landing
│   │
│   ├── components/
│   │   ├── trading/                  # 8 composants trading
│   │   │   ├── chart-panel.tsx       # Dual-iframe TradingView
│   │   │   ├── watchlist-panel.tsx   # Ticker list avec catégories
│   │   │   ├── order-form-panel.tsx  # Buy/Sell form + risk calc
│   │   │   ├── bottom-panel.tsx      # Positions, orders, history, activity
│   │   │   ├── challenge-status-bar.tsx # Challenge metrics
│   │   │   ├── equity-curve-panel.tsx # Equity chart
│   │   │   └── positions-mini-panel.tsx
│   │   ├── dashboard/                # Dashboard components
│   │   ├── admin/                    # Admin components
│   │   ├── landing/                  # Landing page components
│   │   ├── layout/                   # Shared layout (sidebar, nav)
│   │   └── ui/                       # Shadcn/Radix UI primitives
│   │
│   ├── lib/                          # Services & utilitaires
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client (anon key)
│   │   │   ├── server.ts             # SSR client + admin client (service_role)
│   │   │   └── config.ts             # Detection Supabase configuré ou non
│   │   ├── hooks.ts                  # 17 SWR hooks
│   │   ├── auth-context.tsx          # Auth provider React
│   │   ├── realtime.ts              # Supabase Realtime CDC → SWR invalidation
│   │   ├── use-price-stream.ts      # SSE client → 3 canaux de distribution
│   │   ├── binance-prices.ts        # Singleton Binance WebSocket
│   │   ├── price-store.ts           # useSyncExternalStore pour prix live
│   │   ├── ws.ts                    # Centrifugo WebSocket client
│   │   ├── risk-calc.ts             # Calculs de risque (marge, liquidation, PnL)
│   │   └── utils.ts                 # Formatage, calculs, helpers
│   │
│   ├── types/index.ts               # 519 lignes de types TypeScript
│   └── middleware.ts                 # Protection de routes (auth check)
│
├── public/
│   └── tv-chart.html                # TradingView widget standalone
├── supabase/
│   ├── schema.sql                   # Schéma DB complet
│   └── migrations/
│       ├── 20260220_place_market_order_atomic.sql  # RPC atomique
│       └── 20260221_fix_profiles_rls_recursion.sql # Fix RLS
├── scripts/
│   ├── stress-test.mjs              # Test mock backend
│   ├── stress-test-100k.mjs         # Test CRM scale
│   └── stress-test-full.mjs         # Test E2E complet
├── next.config.ts                    # Config Next.js
├── tsconfig.json                     # Config TypeScript (strict)
├── vercel.json                       # Déploiement Vercel + cron
└── package.json
```

### Communication Frontend ↔ Backend
- **REST API** via `fetch()` → `/api/proxy/[...path]` (Next.js API Routes)
- **SSE** (Server-Sent Events) pour le streaming de prix → `/api/prices/stream`
- **Supabase Realtime** (WebSocket CDC) pour l'invalidation de cache SWR
- **Pas de GraphQL, tRPC ni WebSocket custom** pour les trades

### API Gateway / Proxy
- Un **seul point d'entrée** : `src/app/api/proxy/[...path]/route.ts`
- Dispatche vers 6 handlers selon le préfixe du path
- Mode live : peut proxyer vers `app.verticalprop.com` (`PROXY_TO_LIVE=true`)
- Fallback mock si Supabase non configuré

### Déploiement
- **Vercel** (inféré de `vercel.json` + Next.js)
- Cron job : `/api/prices/update` toutes les minutes
- Pas de Docker, pas d'AWS directement

---

## 3. SYSTÈME D'ORDRES (FLOW COMPLET)

### Flow : Click Buy/Sell → Persistence DB

```
┌───────────────────────────────────────────────────────────────────┐
│ 1. CLICK BUY/SELL                                                 │
│    src/components/trading/order-form-panel.tsx                     │
│    handlePlaceOrder('long' | 'short')                             │
│    ├─ Build PlaceOrderRequest payload                             │
│    └─ POST /api/proxy/engine/orders                               │
├───────────────────────────────────────────────────────────────────┤
│ 2. DISPATCHER                                                     │
│    src/app/api/proxy/[...path]/route.ts                           │
│    ├─ apiPath = 'engine/orders'                                   │
│    └─ handleEngineWrite(req, 'engine/orders')                     │
├───────────────────────────────────────────────────────────────────┤
│ 3. VALIDATION (engine-write.ts lines 14-110)                      │
│    ├─ Auth : supabase.auth.getUser() → JWT validation             │
│    ├─ Input : direction ∈ [long,short], order_type ∈ [market,     │
│    │          limit,stop,stop_limit], qty > 0, leverage >= 1      │
│    ├─ PARALLEL DB queries (Promise.all) :                         │
│    │  ├─ admin.from('accounts') → available_margin                │
│    │  ├─ admin.from('instruments') → max_leverage, min_order_size │
│    │  └─ admin.from('price_cache') → current_bid, current_ask     │
│    ├─ Ownership check : account.user_id === user.id               │
│    ├─ Leverage clamp : min(rawLev, instrument.max_leverage)       │
│    ├─ Margin calc : notional / leverage                           │
│    ├─ Fee calc : notional × 0.0007                                │
│    └─ Margin check : margin <= available_margin                   │
├───────────────────────────────────────────────────────────────────┤
│ 4A. MARKET ORDER → RPC ATOMIQUE                                   │
│     admin.rpc('place_market_order', { ... })                      │
│     ┌─ SQL : SELECT * FROM accounts WHERE id=? FOR UPDATE         │
│     ├─ Margin check (row locked, anti race condition)             │
│     ├─ INSERT INTO positions (open)                               │
│     ├─ UPDATE accounts SET available_margin -= margin             │
│     ├─ Optional: INSERT SL order (stop, direction inversée)       │
│     ├─ Optional: INSERT TP order (limit, direction inversée)      │
│     ├─ INSERT INTO activity                                       │
│     └─ RETURN position JSON                                       │
│                                                                   │
│ 4B. LIMIT/STOP ORDER → Direct Insert                              │
│     INSERT INTO orders (status='pending')                         │
│     INSERT INTO activity                                          │
├───────────────────────────────────────────────────────────────────┤
│ 5. OPTIMISTIC UI (order-form-panel.tsx)                           │
│    ├─ mutate(tradingDataKey, inject position, {revalidate:false}) │
│    ├─ setTimeout(100ms) → revalidate 4 SWR keys                  │
│    └─ Toast success (2s timeout)                                  │
├───────────────────────────────────────────────────────────────────┤
│ 6. SWR REFRESH                                                    │
│    ├─ trading-data : refreshInterval 3s, dedup 1s                 │
│    ├─ orders : refreshInterval 3s, dedup 1s                       │
│    ├─ Supabase Realtime CDC → instant SWR invalidation            │
│    └─ UI re-renders avec données fraîches                         │
└───────────────────────────────────────────────────────────────────┘
```

### Code complet du handler d'ordre (engine-write.ts, engine/orders POST)

```typescript
// === VALIDATION ===
const body = await req.json().catch(() => ({})) as Record<string, unknown>
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Strict validation
const VALID_DIRECTIONS  = ['long', 'short'] as const
const VALID_ORDER_TYPES = ['market', 'limit', 'stop', 'stop_limit'] as const
// ... checks on account_id, symbol, direction, order_type, quantity, leverage

// === PARALLEL DB QUERIES ===
const [accountRes, instrumentRes, priceRes] = await Promise.all([
  admin.from('accounts').select('id, user_id, is_active, available_margin')
    .eq('id', body.account_id).single(),
  admin.from('instruments').select('price_decimals, qty_decimals, max_leverage, min_order_size, margin_requirement')
    .eq('symbol', body.symbol).eq('is_active', true).single(),
  admin.from('price_cache').select('current_price, current_bid, current_ask, mark_price')
    .eq('symbol', body.symbol).single(),
])

// === COMPUTE ===
const execPrice = body.order_type === 'market'
  ? (body.direction === 'long' ? current_ask : current_bid)
  : body.price
const notional = execPrice * qty
const margin   = notional / leverage
const fee      = notional * 0.0007
const liqPct   = 1 / leverage
const liquidation_price = body.direction === 'long'
  ? execPrice * (1 - liqPct)
  : execPrice * (1 + liqPct)

// === MARKET → RPC ===
if (body.order_type === 'market') {
  const { data: rpcResult, error } = await admin.rpc('place_market_order', {
    p_account_id, p_user_id, p_symbol, p_direction, p_margin_mode,
    p_quantity, p_leverage, p_exec_price, p_margin, p_fee,
    p_liquidation_price, p_instrument_config, p_instrument_price,
    p_sl_price, p_tp_price,
  })
  return NextResponse.json({ ...rpcResult, status: 'filled' }, { status: 201 })
}
```

### Matching Engine
- ✅ **IMPLÉMENTÉ** — SL/TP matching côté serveur dans `/api/prices/stream/route.ts`
- Exécuté toutes les **2 secondes** dans la boucle SSE
- Requête toutes les positions ouvertes + ordres pending SL/TP
- Compare prix courant vs SL/TP → ferme la position si triggered
- Met à jour : position (status=closed), account (margin+PnL), activity, annule ordres liés

### Messages d'erreur possibles

| Erreur | Status | Condition |
|--------|--------|-----------|
| `Unauthorized` | 401 | JWT invalide ou manquant |
| `Invalid account` | 400 | account_id manquant ou non-string |
| `Invalid symbol` | 400 | symbol manquant |
| `direction must be long or short` | 400 | direction invalide |
| `Invalid order type` | 400 | order_type invalide |
| `quantity must be a positive number` | 400 | qty ≤ 0 |
| `leverage must be >= 1` | 400 | leverage < 1 |
| `Account not found or inactive` | 404 | compte inactif ou inexistant |
| `Forbidden` | 403 | user_id ne match pas |
| `Unknown or inactive symbol` | 400 | instrument non trouvé |
| `Minimum order size is X` | 400 | qty < min_order_size |
| `No price available for this symbol` | 422 | pas de prix en cache |
| `Order size too large` | 400 | notional/margin non-fini |
| `Insufficient margin for this order` | 422 | margin > available_margin |
| `Failed to open position. Please try again.` | 500 | erreur RPC interne |
| `Position not found or already closed` | 404 | close d'une position inexistante |

### L'ordre est-il exécuté côté serveur ou simulé côté client ?
- ✅ **Exécuté côté serveur** via RPC PostgreSQL atomique
- L'UI optimiste est juste une injection cache SWR côté client (pas de simulation)
- Le serveur fait la vérification de marge, le row-lock, l'insertion position

---

## 4. CONNEXION AUX DONNÉES DE MARCHÉ

### Sources de prix

| Source | Type | Paires | Fréquence | Fallback |
|--------|------|--------|-----------|----------|
| **Binance WebSocket** | `wss://stream.binance.com:9443/stream` | 10 crypto (BTC, ETH, SOL, XRP, ADA, DOGE, LINK, ARB, 1INCH, AAVE) | Temps réel | CoinGecko |
| **CoinGecko API** | REST | Crypto fallback (ASTER-USD) | Cron 1min | Bootstrap |
| **Twelve Data API** | REST | 3 forex (EUR, GBP, AUD) | Cron 1min | Random walk |

### Streaming au frontend
- **SSE** (Server-Sent Events) via `/api/prices/stream`
- Fréquence : **500ms** (2 ticks/seconde)
- Headers : `Content-Type: text/event-stream`, `Cache-Control: no-cache`

### Distribution client (3 canaux simultanés)

```
SSE tick (500ms)
├─ Canal 1: price-store → useSyncExternalStore (watchlist ticking)
├─ Canal 2: SWR /instruments → met à jour current_price, bid, ask
└─ Canal 3: SWR /trading-data → met à jour prices map (PnL calculs)
```

### Cache de prix

| Couche | TTL | Stockage |
|--------|-----|----------|
| Binance Manager | Live | `globalThis.__binancePrices` (in-memory) |
| SSE clients | 500ms | Browser EventSource |
| SWR instruments | 500ms | React state |
| Forex (SSE route) | 30s | Variable locale dans la route |
| Supabase price_cache | 5s | Table PostgreSQL (upsert) |

### Spread
- Crypto : 0.015% (`price * 0.00015`)
- Forex : 0.3 pips (`0.00003`)
- Funding rate : `-0.0002` (crypto), `0` (forex)

---

## 5. CHARTING

### Librairie
- **TradingView Widget** (officiel) embarqué dans `public/tv-chart.html`
- Chargé via `<script src="https://s3.tradingview.com/tv.js">`
- **lightweight-charts v5.1.0** installé mais non utilisé pour le chart principal (utilisé dans `equity-curve-panel.tsx` pour la courbe d'equity)
- **recharts v3.7.0** utilisé dans les dashboards (analytics, admin panels)

### Architecture dual-iframe (zero reload)
- 2 iframes chargés au montage : un avec sidebar tools, un sans
- Changement de sidebar : flip de z-index (touche W)
- Changement de symbole : `postMessage({ type: 'set-symbol', symbol })` → pas de reload
- Fullscreen : CSS `fixed inset-0 z-50`

### Config TradingView Widget
```javascript
{
  autosize: true,
  symbol: "BINANCE:BTCUSDT",
  interval: "60",
  timezone: "Etc/UTC",
  theme: "dark",
  style: "1",
  locale: "fr",
  toolbar_bg: "#000000",
  enable_publishing: false,
  allow_symbol_change: false,
  hide_volume: true,
  // Countdown bar activé
}
```

### Timeframes
- Gérés nativement par le widget TradingView (1m, 5m, 15m, 1h, 4h, D, W, M)
- Pas de custom timeframe

### Indicateurs techniques
- Tous les indicateurs natifs TradingView sont disponibles (le widget est complet)
- Pas d'indicateurs custom côté code

---

## 6. GESTION D'ÉTAT (STATE MANAGEMENT)

### Solution
- **SWR** (Stale-While-Revalidate) pour toutes les données serveur
- **useState** local pour l'état UI (formulaires, toggles, collapsed states)
- **useSyncExternalStore** pour les prix live (price-store.ts)
- **Supabase Realtime** pour l'invalidation de cache CDC
- **Pas de Redux, Zustand, Jotai ni Context global** (sauf auth)

### État des positions ouvertes
- SWR key : `/api/proxy/engine/trading-data?account_id=...`
- Refresh : 3s (polling) + SSE prix (500ms injection) + Realtime CDC (instant invalidation)
- Optimistic update : injection immédiate dans le cache SWR après Buy/Sell

### État du portefeuille
- SWR key : `/api/proxy/engine/trading-data?account_id=...` (même endpoint, champ `account`)
- Champs : `available_margin`, `total_margin_required`, `net_worth`, `realized_pnl`, `total_pnl`
- Mis à jour après chaque close/partial-close (serveur update + SWR revalidation)

### Problèmes de re-render identifiables
- `useLivePrices()` (price-store.ts) re-render **tous les 500ms** pour tous les composants abonnés
- `useLivePrice(symbol)` est optimisé — re-render seulement si le prix du symbole change
- Bottom panel et watchlist utilisent `React.memo` sur les rows → mitige le problème
- **6 composants memo** : `LivePositionRow`, `ClosedPositionRow`, `OrderRow`, `ActivityRow`, `AccountStatsBar`, `TickerRow`

---

## 7. AUTHENTIFICATION & UTILISATEURS

### Système
- ✅ **Supabase Auth** (JWT + cookies httpOnly + SameSite=Lax)
- `better-auth` installé mais non utilisé directement (possible legacy)
- Auth context : `src/lib/auth-context.tsx`

### Sessions
- **JWT** validé côté serveur via `supabase.auth.getUser()` (vérifie avec Supabase Auth server)
- Cookies gérés par `@supabase/ssr`
- Middleware Next.js (`src/middleware.ts`) vérifie la session sur les routes protégées
- Fallback mock : cookie `vp-session` en dev

### Rôles
- ✅ **2 rôles** : `user` et `admin`
- Colonne `role` dans la table `profiles`
- Admin vérifié via `is_admin()` SQL function (SECURITY DEFINER)
- Admin a accès à : god-mode panels, force-close, ban, payout approval

### KYC
- ❌ **NON IMPLÉMENTÉ** — pas de système KYC intégré

### Fonctionnalités auth
- ✅ Email/password signup + login
- ✅ Google OAuth (`signInWithGoogle()`)
- ✅ Forgot password / Reset password
- ✅ Ban system (admin peut ban avec raison + expiration)
- ⚠️ 2FA : champ `two_factor_enabled` existe mais implémentation non trouvée

---

## 8. PROP TRADING FEATURES

### Challenges / Évaluations
- ✅ **IMPLÉMENTÉ** — templates de challenges avec phases
- Table `challenge_templates` avec `phase_sequence` (JSONB array de `PhaseRule`)
- 2 templates seed :
  - **100K Instant** : 1 phase, 10% target, $549
  - **50K Standard 2-Step** : 2 phases (8% puis 5%), $299

### PhaseRule (structure)
```typescript
interface PhaseRule {
  phase_number: number
  phase_type: 'evaluation' | 'demo_funded' | 'funded'
  name: string
  profit_target: number        // 0.08 = 8%
  daily_loss_limit: number     // 0.05 = 5%
  max_drawdown: number         // 0.10 = 10%
  min_trading_days: number
  max_trading_days: number | null
  profit_split: number         // 0.80 = 80%
  leverage_limit: number
  news_trading_allowed: boolean
  weekend_holding_allowed: boolean
  martingale_detection_enabled: boolean
}
```

### Drawdown
- ⚠️ **PARTIEL — Drawdown statique uniquement**
- Calcul : `(starting_balance - net_worth) / starting_balance`
- **PAS de trailing drawdown** (pas de high-water mark)
- Le drawdown ne "récupère" pas quand l'equity remonte

### Daily Loss Limit
- ✅ **IMPLÉMENTÉ** — calcul UTC midnight reset
- Inclut les pertes réalisées (positions fermées aujourd'hui) + pertes non réalisées (positions ouvertes marked-to-market)
- Formule : `dailyPnl = realizedToday + unrealizedToday`
- `current_daily_loss = MAX(0, -dailyPnl / starting_balance)`

### Position Size Limits
- ✅ `min_order_size` par instrument (dans `instruments` table)
- ✅ `max_leverage` par instrument (clamp côté serveur)
- ⚠️ Pas de max position size global par compte

### Dashboard monitoring
- ✅ `ChallengeStatusBar` sur la page de trading (profit bar, daily loss bar, drawdown bar, trading days)
- ✅ Dashboard analytics (equity curve, stats)
- ✅ Admin god-mode panels (risk-radar, profiler, command-center)

### Payout
- ✅ **IMPLÉMENTÉ** — request + admin approval
- Profit split : 80% au trader
- Méthodes : crypto, bank, paypal
- Validation : compte doit être `funded`, montant ≤ 80% du realized_pnl
- ❌ **Table `payouts` manquante dans schema.sql** (utilisée dans le code mais pas migrée)

---

## 9. BASE DE DONNÉES — SCHÉMA COMPLET

### Tables principales

#### `profiles`
```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  role        TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  banned      BOOLEAN DEFAULT FALSE,
  ban_reason  TEXT,
  ban_expires TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
-- Trigger: auto-create profile on auth.users INSERT
```

#### `instruments`
```sql
CREATE TABLE instruments (
  id               TEXT PRIMARY KEY,
  symbol           TEXT UNIQUE NOT NULL,
  name             TEXT,
  instrument_type  TEXT CHECK (instrument_type IN ('crypto','forex','stocks','commodities')),
  base_currency    TEXT,
  quote_currency   TEXT,
  margin_requirement NUMERIC DEFAULT 0.01,
  min_order_size   NUMERIC DEFAULT 0.01,
  max_leverage     INT DEFAULT 100,
  tick_size        NUMERIC DEFAULT 0.01,
  lot_size         NUMERIC DEFAULT 0.01,
  price_decimals   INT DEFAULT 2,
  qty_decimals     INT DEFAULT 2,
  is_tradable      BOOLEAN DEFAULT TRUE,
  is_active        BOOLEAN DEFAULT TRUE,
  orderbook_enabled BOOLEAN DEFAULT FALSE,
  trades_enabled   BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
-- 14 instruments seed (11 crypto + 3 forex)
```

#### `price_cache`
```sql
CREATE TABLE price_cache (
  symbol        TEXT PRIMARY KEY REFERENCES instruments(symbol) ON DELETE CASCADE,
  current_price NUMERIC,
  current_bid   NUMERIC,
  current_ask   NUMERIC,
  mark_price    NUMERIC,
  funding_rate  NUMERIC DEFAULT -0.0002,
  next_funding_time BIGINT,
  last_updated  BIGINT
);
```

#### `accounts`
```sql
CREATE TABLE accounts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES profiles(id),
  challenge_template_id  UUID REFERENCES challenge_templates(id),
  name                   TEXT,
  account_type           TEXT DEFAULT 'prop',
  account_type_config    TEXT,
  base_currency          TEXT DEFAULT 'USD',
  default_margin_mode    TEXT DEFAULT 'cross',
  starting_balance       NUMERIC DEFAULT 100000,
  available_margin       NUMERIC DEFAULT 100000,
  reserved_margin        NUMERIC DEFAULT 0,
  total_margin_required  NUMERIC DEFAULT 0,
  net_worth              NUMERIC DEFAULT 100000,
  total_pnl              NUMERIC DEFAULT 0,
  unrealized_pnl         NUMERIC DEFAULT 0,
  realized_pnl           NUMERIC DEFAULT 0,
  injected_funds         NUMERIC DEFAULT 0,
  is_active              BOOLEAN DEFAULT TRUE,
  is_closed              BOOLEAN DEFAULT FALSE,
  account_status         TEXT DEFAULT 'active'
                         CHECK (account_status IN ('active','breached','passed','funded','closed')),
  current_phase          INT DEFAULT 1,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX accounts_user_id_idx ON accounts(user_id);
```

#### `positions`
```sql
CREATE TABLE positions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID REFERENCES accounts(id),
  symbol            TEXT REFERENCES instruments(symbol),
  instrument_config TEXT,
  instrument_price  TEXT,
  direction         TEXT CHECK (direction IN ('long','short')),
  quantity          NUMERIC,
  original_quantity NUMERIC,
  leverage          INT DEFAULT 1,
  entry_price       NUMERIC,
  entry_timestamp   BIGINT,
  exit_price        NUMERIC,
  exit_timestamp    BIGINT,
  liquidation_price NUMERIC,
  status            TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  close_reason      TEXT CHECK (close_reason IN ('manual','sl','tp','limit','liquidation','admin_force')),
  margin_mode       TEXT DEFAULT 'cross',
  isolated_margin   NUMERIC DEFAULT 0,
  isolated_wallet   NUMERIC DEFAULT 0,
  realized_pnl      NUMERIC DEFAULT 0,
  trade_fees        NUMERIC DEFAULT 0,
  overnight_fees    NUMERIC DEFAULT 0,
  funding_fees      NUMERIC DEFAULT 0,
  total_fees        NUMERIC DEFAULT 0,
  total_funding     NUMERIC DEFAULT 0,
  linked_orders     JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX positions_account_id_idx ON positions(account_id);
CREATE INDEX positions_account_status_idx ON positions(account_id, status);
```

#### `orders`
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID REFERENCES accounts(id),
  symbol          TEXT REFERENCES instruments(symbol),
  position_id     UUID REFERENCES positions(id),
  direction       TEXT CHECK (direction IN ('long','short')),
  order_type      TEXT CHECK (order_type IN ('market','limit','stop','stop_limit')),
  quantity        NUMERIC,
  leverage        INT DEFAULT 1,
  price           NUMERIC,
  stop_price      NUMERIC,
  sl_price        NUMERIC,
  tp_price        NUMERIC,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','partial','filled','cancelled')),
  filled_quantity NUMERIC DEFAULT 0,
  margin_mode     TEXT DEFAULT 'cross',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX orders_account_status_idx ON orders(account_id, status);
```

#### `equity_history`
```sql
CREATE TABLE equity_history (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id  UUID REFERENCES accounts(id),
  ts          BIGINT,
  equity      NUMERIC,
  pnl         NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX equity_history_account_ts_idx ON equity_history(account_id, ts);
```

#### `activity`
```sql
CREATE TABLE activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES accounts(id),
  type        TEXT CHECK (type IN ('position','closed','order','challenge','payout','system')),
  title       TEXT,
  sub         TEXT,
  ts          BIGINT,
  pnl         NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX activity_account_ts_idx ON activity(account_id, ts);
```

#### `challenge_templates`
```sql
CREATE TABLE challenge_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  starting_balance NUMERIC DEFAULT 100000,
  base_currency    TEXT DEFAULT 'USD',
  entry_fee        NUMERIC DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  category         TEXT DEFAULT 'paid' CHECK (category IN ('free_trial','paid')),
  phase_sequence   JSONB NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

### Tables manquantes
- ❌ `payouts` — utilisée dans le code mais pas dans `schema.sql`
- ❌ Colonne `breach_reason` sur `accounts` — référencée dans types/code

### RLS Policies

```sql
-- profiles
CREATE POLICY "profiles: self read"    ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: self update"  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles: admin read"   ON profiles FOR SELECT USING (is_admin());

-- accounts
CREATE POLICY "accounts: owner read"   ON accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "accounts: admin read"   ON accounts FOR SELECT USING (is_admin());

-- positions / orders
CREATE POLICY "positions: owner read"  ON positions FOR SELECT
  USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));
CREATE POLICY "positions: admin all"   ON positions FOR ALL USING (is_admin());

-- instruments / price_cache
CREATE POLICY "instruments: public read" ON instruments FOR SELECT USING (true);
CREATE POLICY "price_cache: public read" ON price_cache FOR SELECT USING (true);
```

### Fix RLS Recursion (migration `20260221`)
```sql
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;
```

---

## 10. PROBLÈMES CONNUS ET BUGS

### Bugs critiques résolus
- ✅ **"Position not found or already closed"** : tous les handlers write utilisaient `supabase.from()` (client session, bloqué par RLS recursion) au lieu de `admin.from()` — **corrigé**
- ✅ **Race condition C-06** : 2 ordres simultanés pouvaient dépasser le margin — corrigé via RPC `FOR UPDATE`
- ✅ **RLS infinite recursion 42P17** : policy "admin read" sur `profiles` qui re-query `profiles` — corrigé via `is_admin()` SECURITY DEFINER
- ✅ **Close position ne mettait pas à jour** `total_margin_required`, `net_worth`, `total_pnl` — corrigé

### Problèmes restants

| # | Sévérité | Description |
|---|----------|-------------|
| 1 | ❌ CRITIQUE | Table `payouts` manquante dans schema.sql — utilisée dans le code |
| 2 | ❌ CRITIQUE | Colonne `breach_reason` manquante sur `accounts` |
| 3 | ⚠️ HAUTE | Drawdown statique (pas trailing) — les prop firms standard utilisent un trailing drawdown |
| 4 | ⚠️ HAUTE | Breach detection pas automatisée — nécessite action admin manuelle |
| 5 | ⚠️ HAUTE | Pas de rate limiting sur les API routes |
| 6 | ⚠️ MOYENNE | SL/TP matching engine query toutes les positions ouvertes sans LIMIT — lent à scale |
| 7 | ⚠️ MOYENNE | ASTER-USD : pas de prix Binance, pas de CoinGecko → PnL potentiellement incorrect |
| 8 | ⚠️ MOYENNE | Partial-close a 5 round-trips DB séquentiels (pas fully parallelisé) |
| 9 | ⚠️ BASSE | Pas de déduplication d'ordre (double-click rapide → 2 ordres) |
| 10 | ⚠️ BASSE | Validation wallet address faible (juste length >= 10) |

### TODO/FIXME/HACK
- ✅ **Aucun TODO dans le code de production** — codebase propre

### Features partiellement implémentées
- ⚠️ 2FA : champ existe, implémentation non trouvée
- ⚠️ Centrifugo WebSocket : client implémenté mais `NEXT_PUBLIC_WS_URL` non configuré (fallback SWR polling)
- ⚠️ Leaderboard : view SQL définie mais pas de page dédiée robuste

---

## 11. PERFORMANCE ACTUELLE

### Lazy Loading
- ✅ `React.lazy()` pour les composants landing
- ✅ Dynamic imports pour les clients Supabase (SSR compatibility)
- ✅ `optimizePackageImports` dans `next.config.ts` pour 8 packages

### Memoization
- ✅ **6 composants `React.memo`** : LivePositionRow, ClosedPositionRow, OrderRow, ActivityRow, AccountStatsBar, TickerRow
- ✅ **17 `useMemo`** répartis dans les composants trading et admin
- ✅ **19 `useCallback`** pour les handlers passés en props

### Web Workers
- ❌ **NON IMPLÉMENTÉ** — pas nécessaire pour une UI de trading

### Bundle Optimization
- ✅ `compress: true` (gzip/brotli)
- ✅ `images.formats: ['image/avif', 'image/webp']`
- ✅ `poweredByHeader: false`
- ✅ Tree-shaking via `optimizePackageImports`

### Latence mesurée
- **Ouverture d'ordre** : `console.log('[orders POST] market fill: Xms')` — parallelisation 3 queries
- **Fermeture de position** : `console.log('[close-position] total: Xms')` — 4 round-trips parallélisés
- **SSE tick** : 500ms
- **SWR trading-data refresh** : 3s
- **Optimistic UI** : injection instantanée, revalidation à 100ms

---

## 12. SÉCURITÉ

### HTTPS
- ✅ Géré par Vercel (TLS automatique)

### CORS
- ✅ Same-origin par défaut (Next.js API Routes)
- Pas de headers CORS custom (pas nécessaire)

### Rate Limiting
- ❌ **NON IMPLÉMENTÉ** côté serveur
- SWR dedup intervals côté client (mitigation partielle)

### Validation des inputs
- ⚠️ **Validation manuelle** dans chaque handler (pas de Zod/Joi)
- Types TypeScript pour la compile-time safety
- Validation runtime : checks manuels (typeof, includes, isFinite)

### CSRF
- ✅ Cookies httpOnly + SameSite=Lax (Supabase Auth)
- ✅ Middleware vérifie la session avant les routes protégées

### XSS
- ✅ Pas de `dangerouslySetInnerHTML`
- ✅ Tous les inputs affichés comme texte
- ✅ API responses en JSON uniquement

### Row-Level Security
- ✅ RLS activé sur toutes les tables
- ✅ Owner-based access (user_id match)
- ✅ Admin bypass via `is_admin()` SECURITY DEFINER
- ✅ Admin client (`service_role`) utilisé côté serveur avec checks manuels d'ownership

### Secrets
- ✅ `SUPABASE_SERVICE_ROLE_KEY` jamais exposé au client
- ✅ `TWELVE_DATA_API_KEY` côté serveur uniquement
- ✅ Prix SSE publics (données marché, pas sensibles)

---

## RÉSUMÉ GLOBAL

| Section | État | Score |
|---------|------|-------|
| Stack technique | ✅ Moderne et cohérent | 9/10 |
| Architecture | ✅ Bien structurée | 8/10 |
| Système d'ordres | ✅ Atomique, sécurisé | 9/10 |
| Données de marché | ✅ Multi-source, temps réel | 8/10 |
| Charting | ✅ TradingView natif | 9/10 |
| State management | ✅ SWR + Realtime | 8/10 |
| Auth | ✅ Supabase Auth + RLS | 8/10 |
| Prop trading | ⚠️ Features core OK, drawdown statique | 6/10 |
| DB schema | ⚠️ 2 éléments manquants | 7/10 |
| Bugs connus | ⚠️ 10 items restants | 6/10 |
| Performance | ✅ Optimisée | 8/10 |
| Sécurité | ⚠️ Pas de rate limiting ni validation centralisée | 7/10 |

**Score global : 7.8/10** — Plateforme production-ready avec des améliorations nécessaires sur le drawdown trailing, le rate limiting, et les éléments DB manquants.
