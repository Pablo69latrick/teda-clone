// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export interface Session {
  expiresAt: string
  token: string
  createdAt: string
  updatedAt: string
  ipAddress: string
  userAgent: string
  userId: string
  impersonatedBy: string | null
  id: string
}

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: 'user' | 'admin'
  banned: boolean
  banReason: string | null
  banExpires: string | null
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface SessionResponse {
  session: Session
  user: User
}

// ─────────────────────────────────────────────
// ACCOUNT
// ─────────────────────────────────────────────
export type AccountStatus = 'active' | 'breached' | 'passed' | 'funded' | 'closed'
export type MarginMode = 'cross' | 'isolated'
export type AccountType = 'prop' | 'live' | 'demo'

export interface Account {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  account_type_config: string
  base_currency: string
  default_margin_mode: MarginMode
  available_margin: number
  reserved_margin: number
  total_margin_required: number
  injected_funds: number
  net_worth: number
  total_pnl: number
  unrealized_pnl: number
  realized_pnl: number
  is_active: boolean
  is_closed: boolean
  account_status: AccountStatus
  challenge_template_id: string
  created_at: number
  updated_at: number
}

// Admin version (camelCase)
export interface AdminAccount {
  id: string
  userId: string
  userEmail: string
  userName: string
  accountType: AccountType
  name: string
  availableMargin: number
  reservedMargin: number
  totalMarginRequired: number
  injectedFunds: number
  baseCurrency: string
  defaultMarginMode: MarginMode
  isActive: boolean
  isClosed: boolean
  accountStatus: AccountStatus
  challengeTemplateId: string
  createdAt: number
  updatedAt: number
}

// ─────────────────────────────────────────────
// INSTRUMENT
// ─────────────────────────────────────────────
export type InstrumentType = 'crypto' | 'forex' | 'stocks' | 'commodities'
export type DataProvider = 'okx' | 'polygon'

export interface Instrument {
  id: string
  symbol: string
  instrument_type: InstrumentType
  base_currency: string
  quote_currency: string
  margin_requirement: number
  min_order_size: number
  max_leverage: number
  tick_size: number
  lot_size: number
  price_decimals: number
  qty_decimals: number
  is_tradable: boolean
  is_active: boolean
  orderbook_enabled: boolean
  trades_enabled: boolean
  current_price: number
  current_bid: number
  current_ask: number
  mark_price: number
  funding_rate: number
  next_funding_time: number
  last_updated: number
}

export interface AdminInstrument {
  id: string
  symbol: string
  instrumentType: InstrumentType
  provider: DataProvider
  baseCurrency: string
  quoteCurrency: string
  marginRequirement: number
  minOrderSize: number
  maxLeverage: number
  tickSize: number
  lotSize: number
  priceDecimals: number
  qtyDecimals: number
  isTradable: boolean
  isActive: boolean
  orderbookEnabled: boolean
  tradesEnabled: boolean
  createdAt: number
  updatedAt: number
}

// ─────────────────────────────────────────────
// POSITION
// ─────────────────────────────────────────────
export type PositionDirection = 'long' | 'short'
export type PositionStatus = 'open' | 'closed'
export type CloseReason = 'manual' | 'sl' | 'tp' | 'limit' | 'liquidation' | null

export interface Position {
  id: string
  account_id: string
  instrument_config: string
  instrument_price: string
  symbol: string
  direction: PositionDirection
  quantity: number
  leverage: number
  entry_price: number
  entry_timestamp: number
  exit_price: number | null
  exit_timestamp: number | null
  liquidation_price: number
  status: PositionStatus
  close_reason: CloseReason
  margin_mode: MarginMode
  isolated_margin: number
  isolated_wallet: number | null
  realized_pnl: number
  trade_fees: number
  overnight_fees: number
  funding_fees: number
  total_fees: number
  total_funding: number
  linked_orders: string[] | null
  original_quantity: number | null
  created_at: number
  updated_at: number
}

// ─────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled'

export interface Order {
  id: string
  account_id: string
  symbol: string
  direction: PositionDirection
  order_type: OrderType
  quantity: number
  leverage: number
  price: number | null
  stop_price: number | null
  status: OrderStatus
  margin_mode: MarginMode
  position_id: string | null
  created_at: number
  updated_at: number
}

export interface PlaceOrderRequest {
  account_id: string
  symbol: string
  direction: PositionDirection
  order_type: OrderType
  quantity: number
  leverage: number
  price?: number
  stop_price?: number
  margin_mode: MarginMode
  sl_price?: number
  tp_price?: number
}

// ─────────────────────────────────────────────
// TRADING DATA (combined endpoint)
// ─────────────────────────────────────────────
export interface TradingData {
  account: Account
  positions: Position[]
  instruments: Instrument[]
  prices: Record<string, number>
}

// ─────────────────────────────────────────────
// CHALLENGE / PHASE RULES
// ─────────────────────────────────────────────
export type ChallengeType = 'instant' | '1-step' | '2-step'
export type PhaseType = 'evaluation' | 'demo_funded' | 'funded'
export type TemplateStatus = 'active' | 'paused' | 'archived'
export type TemplateCategory = 'free_trial' | 'paid'

export interface PhaseRule {
  phase_number: number
  phase_type: PhaseType
  name: string
  profit_target: number          // e.g. 0.08 = 8%
  daily_loss_limit: number       // e.g. 0.05 = 5%
  max_drawdown: number           // e.g. 0.10 = 10%
  min_trading_days: number
  max_trading_days: number | null
  profit_split: number           // e.g. 0.80 = 80%
  leverage_limit: number
  news_trading_allowed: boolean
  weekend_holding_allowed: boolean
  martingale_detection_enabled: boolean
}

export interface ChallengeTemplate {
  id: string
  name: string
  description: string | null
  starting_balance: number
  base_currency: string
  phase_sequence: PhaseRule[]
  entry_fee: number
  is_active: boolean
  status: TemplateStatus
  created_at: number
  updated_at: number
  // God mode extras
  account_count?: number
  category?: TemplateCategory
}

// Challenge status per account
export interface ChallengeStatus {
  account_id: string
  current_phase: number
  phase_type: PhaseType
  profit_target: number
  daily_loss_limit: number
  max_drawdown: number
  current_profit: number
  current_daily_loss: number
  current_drawdown: number
  trading_days: number
  min_trading_days: number
  is_passed: boolean
  is_breached: boolean
  breach_reason: string | null
}

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number
  account_id: string
  user_id: string
  username: string
  avatar_url: string | null
  profit_pct: number
  profit_amount: number
  trading_days: number
  challenge_type: ChallengeType | string
  is_funded: boolean
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export type NotificationType = 'position' | 'order' | 'challenge' | 'payout' | 'system'

export interface Notification {
  id: string
  account_id: string | null
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: number
}

// ─────────────────────────────────────────────
// AFFILIATE
// ─────────────────────────────────────────────
export type AffiliateStatus = 'active' | 'pending' | 'suspended'

export interface Affiliate {
  id: string
  userId: string
  userEmail: string
  userName: string
  programId: string
  programName: string
  affiliateCode: string
  status: AffiliateStatus
  statusReason: string | null
}

// ─────────────────────────────────────────────
// ADMIN — USERS
// ─────────────────────────────────────────────
export interface AdminUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: 'user' | 'admin'
  banned: boolean
  banReason: string | null
  banExpires: string | null
  twoFactorEnabled: boolean
  createdAt: number
  updatedAt: number
  lastSeen: number
}

// ─────────────────────────────────────────────
// ADMIN — GAME DESIGNER
// ─────────────────────────────────────────────
export interface PhaseConversionStage {
  stage: string
  phase_number: number
  phase_type: PhaseType | 'payout'
  count: number
  passed: number
  failed: number
  active: number
  conversion_rate: number
  cumulative_pass_rate: number
  avg_days_in_phase: number
}

export interface PhaseConversionResponse {
  stages: PhaseConversionStage[]
  overall_rate: number
  total_funded_amount: number
  avg_funded_size: number
  avg_days_to_funded: number
  challenge_type: ChallengeType
  phase_count: number
}

export interface TemplateComparisonEntry {
  template_id: string
  template_name: string
  challenge_type: ChallengeType
  total_starts: number
  phase_pass_rates: number[]
  funded_count: number
  funded_rate: number
  payout_count: number
  payout_rate: number
  total_funded_capital: number
  total_payouts: number
  avg_days_to_funded: number
}

export interface GameDesignerInsight {
  icon: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  action: string | null
}

// ─────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface ApiError {
  error: string
  code?: string
}

// ─────────────────────────────────────────────
// CENTRIFUGO / WEBSOCKET EVENTS
// ─────────────────────────────────────────────
export interface CentrifugoToken {
  token: string
}

export type WsEventType =
  | 'position.opened'
  | 'position.updated'
  | 'position.closed'
  | 'order.placed'
  | 'order.filled'
  | 'order.cancelled'
  | 'account.updated'
  | 'price.tick'
  | 'notification'

export interface WsEvent<T = unknown> {
  type: WsEventType
  data: T
  timestamp: number
}
