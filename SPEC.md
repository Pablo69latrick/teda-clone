# VerticalProp — Complete Platform Specification
> Extracted via live browser inspection of https://app.verticalprop.com
> Date: 2026-02-19

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, React Server Components) |
| Styling | Tailwind CSS + shadcn/ui |
| Font | Laila (Google Fonts, woff2, weights 300/400/500/600/700) |
| Charts | TradingView Charting Library (standalone, self-hosted) |
| Real-time | Centrifugo WebSocket server |
| Auth | better-auth (session-based, JWT for Centrifugo) |
| Price feeds | OKX API (crypto) + Polygon.io (forex/stocks) |
| Notifications | Sonner (toast library) |
| Resizable panels | react-resizable-panels |
| Icons | Lucide React |
| PWA | manifest.json, service worker |
| Animations | Tailwind keyframes (shimmer, fadeInUp, sparkle, claude-pulse, etc.) |

---

## 2. DESIGN SYSTEM

### 2.1 CSS Custom Properties

#### Dark Mode (`.dark`)
```css
:root {
  /* Core */
  --background: #070707;
  --foreground: #f8f8f8;

  /* Cards */
  --card: #101013;
  --card-foreground: #f8f8f8;
  --fixed-card: #101013;
  --fixed-light-dark: #0a0a0a;
  --light-dark: #0a0a0a;
  --dark: #050505;

  /* Popover */
  --popover: #090909;
  --popover-foreground: #f8f8f8;

  /* Primary */
  --primary: #e8e8e8;
  --primary-foreground: #161616;

  /* Secondary */
  --secondary: #292929;
  --secondary-foreground: #f8f8f8;

  /* Muted */
  --muted: #292929;
  --muted-foreground: #8f8f8f;

  /* Accent */
  --accent: #292929;
  --accent-foreground: #f8f8f8;

  /* Destructive */
  --destructive: #ff6568;

  /* Border / Input / Ring */
  --border: #ffffff1a;
  --input: #ffffff26;
  --ring: #717171;

  /* Grey helper */
  --grey: #1f1f1f;

  /* Text */
  --text: #999;

  /* Charts */
  --chart-1: #1447e6;
  --chart-2: #00bb7f;
  --chart-3: #f99c00;
  --chart-4: #ac4bff;
  --chart-5: #ff2357;

  /* Trading P&L */
  --profit: #4a9a7d;
  --loss: #e04b50;

  /* Sidebar */
  --sidebar: #161616;
  --sidebar-foreground: #f8f8f8;
  --sidebar-primary: #1447e6;
  --sidebar-primary-foreground: #f8f8f8;
  --sidebar-accent: #292929;
  --sidebar-accent-foreground: #f8f8f8;
  --sidebar-border: #ffffff1a;
  --sidebar-ring: #717171;

  /* Misc */
  --radius: 0.625rem;
  --vibrant-blue: #4c72d1;
  --shimmer-bg: #232323;
  --shimmer-gradient: linear-gradient(90deg,#0d0d0d00 0,#0d0d0d1a 20%,#2929291a 60%,#0d0d0d00);
}
```

#### Light Mode (`:root` / `.light`)
```css
:root {
  --background: #fff;
  --foreground: #070707;
  --card: #fff;
  --card-foreground: #070707;
  --fixed-card: #fff;
  --fixed-light-dark: #fafafa;
  --light-dark: #fafafa;
  --dark: #f5f5f5;
  --popover: #fff;
  --popover-foreground: #070707;
  --primary: #161616;
  --primary-foreground: #f8f8f8;
  --secondary: #eee;
  --secondary-foreground: #161616;
  --muted: #eee;
  --muted-foreground: #555;
  --accent: #e4e4e4;
  --accent-foreground: #181818;
  --destructive: #e40014;
  --border: #dedede;
  --input: #dedede;
  --ring: gray;
  --grey: #e5e5e5;
  --text: #666;
  --chart-1: #f05100;
  --chart-2: #009588;
  --chart-3: #104e64;
  --chart-4: #fcbb00;
  --chart-5: #f99c00;
  --profit: #16a34a;
  --loss: #dc2626;
  --sidebar: #f8f8f8;
  --sidebar-foreground: #070707;
  --sidebar-primary: #161616;
  --sidebar-primary-foreground: #f8f8f8;
  --sidebar-accent: #eee;
  --sidebar-accent-foreground: #161616;
  --sidebar-border: #dedede;
  --vibrant-blue: #4c72d1;
  --shimmer-bg: #e5e5e5;
  --shimmer-gradient: linear-gradient(90deg,#fff0 0,#fff6 20%,#fff9 60%,#fff0);
}
```

#### Dashboard theme override (`.dark .dashboard-theme`)
```css
--card: #1a1a1a;
--dark: #0f0f0f;
--grey: #262626;
--light-dark: #1a1a1a;
```

### 2.2 Typography

| Class | Font Size | Line Height |
|-------|-----------|-------------|
| text-2xs | 10px | 15px |
| text-xs | 12px | 16px |
| text-sm | 14px | 20px |
| text-base | 16px | 24px |
| text-lg | 18px | 28px |
| text-xl | 20px | 28px |
| text-2xl | 24px | 32px |
| text-3xl | 30px | 36px |
| text-4xl | 36px | 40px |

Font: **Laila** (Google Fonts) — variable name `--font-inter` mapped to `"Laila","Laila Fallback"`

### 2.3 Scrollbar
```css
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 100px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: lab(42 0 0 / 0.2); border-radius: 100px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: lab(42 0 0 / 0.35); }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: lab(65.2 0 0 / 0.15); }
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: lab(65.2 0 0 / 0.3); }
.hide-scrollbar::-webkit-scrollbar { display: none; }
```

### 2.4 Animations / Keyframes
- `shimmer` — loading skeleton
- `fadeInUp` — elements entering from below
- `sparkle` — highlight effect
- `spin`, `pulse`, `bounce` — utilities
- `enter` / `exit` — modal/sheet transitions
- `caret-blink` — input cursor
- `swipe-out-left/right/up/down` — swipe gestures
- `sonner-fade-in/out` — toast notifications
- `fadeIn/Out`, `slideFromBottom/Top/Left/Right`, `slideToBottom/Top/Left/Right` — page transitions
- `claude-pulse` — special indicator

### 2.5 Body Classes
```
html: class="dark" (or "light")
body: class="min-h-screen bg-background font-sans antialiased laila_[hash]__variable"
main (dashboard): class="flex-1 min-h-dvh overflow-auto pb-safe custom-scrollbar"
main (trade): class="sm:flex-1 sm:min-h-0 sm:overflow-y-auto relative z-10"
```

---

## 3. APPLICATION LAYOUT & ROUTES

### 3.1 Route Structure
```
/                          → redirect to /dashboard/overview
/trade                     → Trading terminal
/dashboard/overview        → Dashboard home
/dashboard/analytics       → Analytics (charts, stats)
/dashboard/calendar        → Economic calendar
/dashboard/payouts         → Payout requests
/dashboard/competitions    → Competitions
/dashboard/leaderboard     → Leaderboard
/dashboard/history         → Trade history
/dashboard/affiliate       → Affiliate program
/dashboard/admin/god-mode/command-center   → Admin: stats overview
/dashboard/admin/god-mode/profiler         → Admin: trader profiler
/dashboard/admin/god-mode/treasurer        → Admin: financial control
/dashboard/admin/god-mode/risk-radar       → Admin: risk monitoring
/dashboard/admin/god-mode/game-designer    → Admin: challenge template builder
/help                      → Help center / academy
/help/[slug]               → Help articles
```

### 3.2 Sidebar Layout (Collapsed — 64px wide `w-16`)
```
ASIDE: fixed top-0 left-0 py-4 px-2 h-full flex flex-col z-20
       bg-card/95 backdrop-blur-xl border-r border-border/50 shadow-sm w-16

Logo (top):     w-9 h-9 SVG, hover:scale-105
Trade button:   bg-gradient-to-r from-primary to-primary/80, rounded-lg, w-10 h-9
                hover:shadow-md hover:shadow-primary/20, active:scale-[0.98]
Nav items:      flex items-center h-9 rounded-lg transition-all duration-200 ease-out
                w-10 mx-auto justify-center
                ACTIVE:  bg-primary/10 text-foreground shadow-sm
                INACTIVE: text-muted-foreground hover:bg-muted/60 hover:text-foreground
Get Funded:     Same style as Trade button (gradient primary)
Academy:        Regular nav item → /help
Admin Panel:    Regular nav item → /dashboard/admin/god-mode/treasurer
Settings:       Bottom of sidebar, flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm
```

### 3.3 Navigation Links
| Label | Route | Note |
|-------|-------|------|
| Trade | /trade | Primary CTA - gradient button |
| Overview | /dashboard/overview | Active indicator bg-primary/10 |
| Analytics | /dashboard/analytics | |
| Competitions | /dashboard/competitions | |
| Leaderboard | /dashboard/leaderboard | |
| Calendar | /dashboard/calendar | |
| Payouts | /dashboard/payouts | |
| Affiliate | /dashboard/affiliate | |
| Get Funded | (shop page) | Primary gradient button |
| Academy | /help | |
| Admin Panel | /dashboard/admin/god-mode/treasurer | Admin only |
| Settings | (dropdown) | Avatar button bottom |

### 3.4 Main Content Area
```
Dashboard: div.flex-1.flex.flex-col.sm:ml-16.p-4.pr-3.lg:p-6.xl:p-8.max-sm:pb-20
Trade:     div.relative.flex.flex-col.h-full.flex-1.sm:pl-16.sm:p-4.overflow-hidden
```

### 3.5 Trade Page Layout (Desktop)
```
ARTICLE: flex flex-row h-[calc(100vh-32px)] pl-2
  └─ ResizablePanelGroup (horizontal)
       ├─ ResizablePanel (main, ~75%)
       │    └─ ResizablePanelGroup (vertical)
       │         ├─ ResizablePanel (chart, ~65%)
       │         │    ├─ Toolbar (timeframes, indicators, settings)
       │         │    └─ TradingView chart (id="tradingview_chart")
       │         ├─ ResizeHandle (cursor-row-resize, h-4)
       │         └─ ResizablePanel (bottom, ~35%)
       │              └─ Tabs: Positions | Orders | History | Assets | Notifications
       └─ ResizablePanel (right, ~25%)
            ├─ Watchlist panel (instrument search + list)
            └─ Order form panel
                 ├─ Symbol header: name, Risk/SL/TP toggles, chevron
                 ├─ Init Margin display
                 ├─ Short / Long buttons (grid-cols-7 gap-1 p-2)
                 ├─ Quantity input (lots)
                 ├─ Price input
                 └─ Footer: MARGIN USED | FUNDING | NEXT countdown
```

### 3.6 Bottom Panel — Positions Tab Columns
- Symbol | Side | Size (lots @ entry price) | Entry Price | Exit Price | PnL | Close Reason

### 3.7 Account Summary Widget (Trade bottom-left)
- EQUITY | PROFIT/LOSS | MARGIN USED | FUNDING rate | NEXT countdown

---

## 4. API ENDPOINTS

### Base URL: `https://app.verticalprop.com`

### 4.1 Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/get-session` | Get current session + user |
| POST | `/api/auth/...` | better-auth routes (sign-in, sign-up, etc.) |
| GET | `/api/centrifugo/token` | Get JWT for WebSocket connection |

### 4.2 Engine (Trading)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/engine/trading-data?account_id={id}&instruments_limit=50` | Account + open positions + instruments + prices |
| GET | `/api/engine/instruments?limit=50&offset=0&tradable_only=true` | Instrument list with live prices |
| GET | `/api/engine/positions?account_id={id}&limit=20&offset=0` | Positions list |
| GET | `/api/engine/orders?account_id={id}&statuses=pending,partial` | Active orders |
| GET | `/api/engine/notifications?limit=20&offset=0&account_id={id}` | Notifications |
| GET | `/api/engine/bookmarks` | Bookmarked instruments |
| GET | `/api/engine/accounts/{id}/challenge-status` | Challenge progress/rules |
| POST | `/api/engine/orders` | Place new order |
| DELETE/PATCH | `/api/engine/orders/{id}` | Cancel/modify order |
| DELETE | `/api/engine/positions/{id}` | Close position |

### 4.3 Actions (Client)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actions/accounts` | User's trading accounts list |

### 4.4 Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/accounts?limit=N&offset=N` | All accounts (admin) |
| GET | `/api/admin/users?limit=N&offset=N` | All users (admin) |
| GET | `/api/admin/challenge-templates` | All challenge templates |
| GET | `/api/admin/challenge-templates/{id}` | Template detail |
| GET | `/api/admin/instruments?limit=N` | Admin instrument management |
| GET | `/api/admin/affiliates?limit=N` | Affiliate list |

### 4.5 Admin God Mode (requires re-auth every 1h)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/god-mode/game-designer/challenge-templates` | Templates with account_count + category |
| GET | `/api/admin/god-mode/game-designer/phase-conversions` | Phase funnel stats |
| GET | `/api/admin/god-mode/game-designer/phase-conversions?challenge_type=instant\|1-step\|2-step` | Filtered funnel |
| GET | `/api/admin/god-mode/game-designer/template-comparison` | Template performance comparison |
| GET | `/api/admin/god-mode/game-designer/insights` | AI-generated insights |

### 4.6 Misc
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Leaderboard entries |
| GET | `/api/misc/calendar` | Economic calendar |
| GET | `/api/tradingview` | TradingView datafeed proxy |
| GET | `/api/affiliate/validate-code` | Validate affiliate code |
| POST | `/api/affiliate/track-referral` | Track referral click |
| GET | `/api/share-links/position` | Shareable position image |
| GET | `/api/share-links/performance` | Shareable performance image |
| GET | `/api/share-links/leaderboard` | Shareable leaderboard image |

---

## 5. DATA SCHEMAS

### 5.1 Session
```typescript
interface Session {
  expiresAt: string;       // ISO date
  token: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string;
  userAgent: string;
  userId: string;
  impersonatedBy: string | null;
  id: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: "user" | "admin";
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Account
```typescript
interface Account {
  id: string;                          // UUID
  user_id: string;
  name: string;                        // e.g. "Phase 1 - Evaluation"
  account_type: "prop" | "live";
  account_type_config: string;
  base_currency: "USD";
  default_margin_mode: "cross" | "isolated";
  available_margin: number;
  reserved_margin: number;
  total_margin_required: number;
  injected_funds: number;              // Starting balance
  net_worth: number;
  total_pnl: number;
  unrealized_pnl: number;
  realized_pnl: number;
  is_active: boolean;
  is_closed: boolean;
  account_status: "active" | "breached" | "passed" | "funded" | "closed";
  challenge_template_id: string;
  created_at: number;                  // Unix ms
  updated_at: number;                  // Unix ms
}
```

### 5.3 Instrument
```typescript
interface Instrument {
  id: string;                          // ULID
  symbol: string;                      // e.g. "1INCH-USD"
  instrument_type: "crypto" | "forex" | "stocks" | "commodities";
  base_currency: string;
  quote_currency: string;              // "USD"
  margin_requirement: number;          // e.g. 0.01 = 1%
  min_order_size: number;
  max_leverage: number;
  tick_size: number;
  lot_size: number;
  price_decimals: number;
  qty_decimals: number;
  is_tradable: boolean;
  is_active: boolean;
  orderbook_enabled: boolean;
  trades_enabled: boolean;
  current_price: number;
  current_bid: number;
  current_ask: number;
  mark_price: number;
  funding_rate: number;
  next_funding_time: number;           // Unix ms
  last_updated: number;               // Unix ms
}

// Admin version adds:
interface AdminInstrument extends Instrument {
  provider: "okx" | "polygon";
  createdAt: number;                   // Unix seconds
  updatedAt: number;
}
```

### 5.4 Position
```typescript
interface Position {
  id: string;                          // ULID
  account_id: string;
  instrument_config: string;           // ULID ref
  instrument_price: string;
  symbol: string;
  direction: "long" | "short";
  quantity: number;                    // In lots
  leverage: number;
  entry_price: number;
  entry_timestamp: number;            // Unix ms
  exit_price: number | null;
  exit_timestamp: number | null;
  liquidation_price: number;
  status: "open" | "closed";
  close_reason: "manual" | "sl" | "tp" | "limit" | "liquidation" | null;
  margin_mode: "cross" | "isolated";
  isolated_margin: number;
  isolated_wallet: number | null;
  realized_pnl: number;
  trade_fees: number;
  overnight_fees: number;
  funding_fees: number;
  total_fees: number;
  total_funding: number;
  linked_orders: null;                 // Order IDs for SL/TP
  original_quantity: null;
  created_at: number;
  updated_at: number;
}
```

### 5.5 Order
```typescript
interface Order {
  id: string;
  account_id: string;
  symbol: string;
  direction: "long" | "short";
  order_type: "market" | "limit" | "stop" | "stop_limit";
  quantity: number;
  leverage: number;
  price: number | null;               // null for market orders
  stop_price: number | null;
  status: "pending" | "partial" | "filled" | "cancelled";
  margin_mode: "cross" | "isolated";
  position_id: string | null;         // Linked position (for SL/TP)
  created_at: number;
  updated_at: number;
}
```

### 5.6 Challenge Template
```typescript
interface ChallengeTemplate {
  id: string;
  name: string;
  description: string | null;
  starting_balance: number;
  base_currency: "USD";
  phase_sequence: PhaseRule[];
  entry_fee: number;
  is_active: boolean;
  status: "active" | "paused" | "archived";
  created_at: number;
  updated_at: number;
  // God mode adds:
  account_count?: number;
  category?: "free_trial" | "paid";
}

interface PhaseRule {
  phase_number: number;
  phase_type: "evaluation" | "demo_funded" | "funded";
  name: string;                        // e.g. "Evaluation", "Validation"
  profit_target: number;               // e.g. 0.08 = 8%
  daily_loss_limit: number;            // e.g. 0.05 = 5%
  max_drawdown: number;                // e.g. 0.10 = 10%
  min_trading_days: number;
  max_trading_days: number | null;
  // Confirmed broken field causing 500:
  martingale_detection_enabled: boolean;
  // Other likely fields:
  profit_split: number;                // e.g. 0.80 = 80%
  leverage_limit: number;
  news_trading_allowed: boolean;
  weekend_holding_allowed: boolean;
}
```

### 5.7 User (Admin)
```typescript
interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: "user" | "admin";
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  twoFactorEnabled: boolean;
  createdAt: number;                   // Unix seconds
  updatedAt: number;
  lastSeen: number;
}
```

### 5.8 Leaderboard Entry
```typescript
interface LeaderboardEntry {
  rank: number;
  account_id: string;
  trader_name: string;
  pnl_percent: number;
  pnl_usd: number;
  used_margin: number;
  available_margin: number;
  unrealized_pnl: number;
}
```

### 5.9 Affiliate
```typescript
interface Affiliate {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  programId: string;                   // e.g. "prog_ambassador"
  programName: string;                 // e.g. "Ambassador Program"
  affiliateCode: string;               // e.g. "LANCELA2E6"
  status: "active" | "pending" | "suspended";
  statusReason: string | null;
}
```

### 5.10 Phase Conversion Stats (Game Designer)
```typescript
interface PhaseConversionStage {
  stage: string;                       // e.g. "Evaluation", "Validation", "Funded"
  phase_number: number;
  phase_type: "evaluation" | "demo_funded" | "funded" | "payout";
  count: number;
  passed: number;
  failed: number;
  active: number;
  conversion_rate: number;             // % from previous stage
  cumulative_pass_rate: number;
  avg_days_in_phase: number;
}

interface PhaseConversionResponse {
  stages: PhaseConversionStage[];
  overall_rate: number;
  total_funded_amount: number;
  avg_funded_size: number;
  avg_days_to_funded: number;
  challenge_type: "instant" | "1-step" | "2-step";
  phase_count: number;
}
```

---

## 6. REAL-TIME (CENTRIFUGO)

- Token endpoint: `GET /api/centrifugo/token` → `{ token: "eyJ..." }` (JWT, 30min expiry)
- Channels subscribed: account-specific channels for:
  - Position updates
  - Order fills
  - Price ticks
  - Notifications
  - Account balance changes

---

## 7. TRADING ENGINE LOGIC

### 7.1 Margin Calculation
- **Cross margin**: Shared pool across all positions
- **Isolated margin**: Per-position margin
- **Required margin** = (quantity × entry_price) / leverage
- **Liquidation price (long)**: entry_price × (1 - 1/leverage + maintenance_margin)
- **Liquidation price (short)**: entry_price × (1 + 1/leverage - maintenance_margin)

### 7.2 Fees
- `trade_fees`: Per-trade commission
- `overnight_fees`: Overnight/swap fees
- `funding_fees`: Perpetual funding rate fees
- `total_fees = trade_fees + overnight_fees + funding_fees`

### 7.3 PnL Calculation
- **Long PnL** = (exit_price - entry_price) × quantity - total_fees
- **Short PnL** = (entry_price - exit_price) × quantity - total_fees
- `net_worth = injected_funds + total_pnl`

### 7.4 Account Statuses
- `active` → Trading normally
- `breached` → Violated challenge rules (daily loss or max drawdown)
- `passed` → Completed phase successfully
- `funded` → Receiving real payouts
- `closed` → Account terminated

---

## 8. CHALLENGE RULES ENGINE

Challenge types: `instant` | `1-step` | `2-step`

### Typical 2-step Flow:
1. **Phase 1 - Evaluation**: Hit profit target (e.g. 8%) without breaching drawdown (10%) or daily loss (5%)
2. **Phase 2 - Validation**: Confirm consistency with lower profit target (e.g. 5%)
3. **Funded**: Real payout account

### Rule Enforcement (from broken error message):
```
missing field `martingale_detection_enabled`
```
The engine is Rust-based (returns typed error about missing fields in snapshot deserialization)

---

## 9. ADMIN PANEL — GOD MODE SECTIONS

### Command Center
- Platform overview stats
- Active traders count, total funded, revenue

### Profiler
- Per-trader deep analysis
- Trade patterns, risk behavior, win rate

### Treasurer
- Payout management
- Financial controls, bank transactions

### Risk Radar
- Real-time risk monitoring
- B-Book/A-Book exposure
- Position concentration

### Game Designer
- Challenge template CRUD
- Phase rules editor (profit target, drawdown, daily loss, min days, max leverage, news trading, weekend holding, martingale detection)
- Phase conversion funnel analytics
- Template comparison table
- AI insights

---

## 10. AFFILIATE SYSTEM

- Programs: e.g. "Ambassador Program" (`prog_ambassador`)
- Each affiliate gets unique code (e.g. `LANCELA2E6`)
- Referral tracking via `/api/affiliate/track-referral`
- Code validation via `/api/affiliate/validate-code`

---

## 11. SHARE LINKS

Generate shareable card images for:
- `/api/share-links/position` — Single position card
- `/api/share-links/performance` — Overall performance card
- `/api/share-links/leaderboard` — Leaderboard standing card

---

## 12. BUILD PLAN (PHASES)

### Phase 1 ✅ — Analysis (DONE)
- Design system extracted
- All API endpoints documented
- Full data schemas defined
- UI layout mapped

### Phase 2 — Project Scaffolding
- Next.js 14 App Router setup
- Tailwind + shadcn/ui
- globals.css with full design tokens
- Font setup (Laila)
- Folder structure

### Phase 3 — Core UI
- Root layout + sidebar
- Dashboard overview page
- Trade terminal (chart + panels)
- Auth pages (login/register)

### Phase 4 — Trading Engine
- Position management
- Order placement
- Margin/PnL calculations
- WebSocket (Centrifugo)
- TradingView integration

### Phase 5 — Challenge System
- Challenge rules engine
- Phase tracking
- Account status management
- Admin Game Designer UI

### Phase 6 — Admin Panel
- God Mode interface
- All 5 sections
- User/account management

### Phase 7 — Extras
- Affiliate system
- Share links
- Leaderboard
- Economic calendar
- Notifications
- PWA manifest
