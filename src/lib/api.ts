/**
 * API client — all calls to /api/* routes
 * Uses native fetch; compatible with Next.js server components + client components
 */

import type {
  Account,
  AdminAccount,
  AdminInstrument,
  AdminUser,
  Affiliate,
  CentrifugoToken,
  ChallengeTemplate,
  GameDesignerInsight,
  Instrument,
  LeaderboardEntry,
  Notification,
  Order,
  PhaseConversionResponse,
  PlaceOrderRequest,
  Position,
  SessionResponse,
  TemplateComparisonEntry,
  TradingData,
} from '@/types'

// ─── Base fetch wrapper ─────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err?.error ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── AUTH ───────────────────────────────────────
export const auth = {
  getSession: () =>
    apiFetch<SessionResponse>('/api/auth/get-session'),

  signIn: (email: string, password: string) =>
    apiFetch<SessionResponse>('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signUp: (name: string, email: string, password: string) =>
    apiFetch<SessionResponse>('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  signOut: () =>
    apiFetch<void>('/api/auth/sign-out', { method: 'POST' }),
}

// ─── CENTRIFUGO ─────────────────────────────────
export const centrifugo = {
  getToken: () =>
    apiFetch<CentrifugoToken>('/api/centrifugo/token'),
}

// ─── USER ACCOUNTS ──────────────────────────────
export const accounts = {
  list: () =>
    apiFetch<{ accounts: Account[] }>('/api/actions/accounts'),
}

// ─── TRADING ENGINE ─────────────────────────────
export const engine = {
  getTradingData: (accountId: string, instrumentsLimit = 50) =>
    apiFetch<TradingData>(
      `/api/engine/trading-data?account_id=${accountId}&instruments_limit=${instrumentsLimit}`
    ),

  getInstruments: (params?: {
    limit?: number
    offset?: number
    tradableOnly?: boolean
    type?: string
    search?: string
  }) => {
    const q = new URLSearchParams({
      limit: String(params?.limit ?? 50),
      offset: String(params?.offset ?? 0),
      ...(params?.tradableOnly ? { tradable_only: 'true' } : {}),
      ...(params?.type ? { type: params.type } : {}),
      ...(params?.search ? { search: params.search } : {}),
    })
    return apiFetch<{ instruments: Instrument[]; total: number }>(
      `/api/engine/instruments?${q}`
    )
  },

  getPositions: (accountId: string, limit = 20, offset = 0) =>
    apiFetch<{ positions: Position[]; total: number }>(
      `/api/engine/positions?account_id=${accountId}&limit=${limit}&offset=${offset}`
    ),

  getOrders: (accountId: string, statuses = 'pending,partial') =>
    apiFetch<{ orders: Order[] }>(
      `/api/engine/orders?account_id=${accountId}&statuses=${statuses}`
    ),

  placeOrder: (data: PlaceOrderRequest) =>
    apiFetch<{ order: Order }>('/api/engine/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelOrder: (orderId: string) =>
    apiFetch<void>(`/api/engine/orders/${orderId}`, { method: 'DELETE' }),

  closePosition: (positionId: string, quantity?: number) =>
    apiFetch<{ position: Position }>(`/api/engine/positions/${positionId}`, {
      method: 'DELETE',
      body: quantity ? JSON.stringify({ quantity }) : undefined,
    }),

  getNotifications: (params?: { accountId?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
      ...(params?.accountId ? { account_id: params.accountId } : {}),
    })
    return apiFetch<{ notifications: Notification[] }>(
      `/api/engine/notifications?${q}`
    )
  },

  getBookmarks: () =>
    apiFetch<string[]>('/api/engine/bookmarks'),

  addBookmark: (symbol: string) =>
    apiFetch<void>('/api/engine/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    }),

  removeBookmark: (symbol: string) =>
    apiFetch<void>(`/api/engine/bookmarks/${symbol}`, { method: 'DELETE' }),

  getChallengeStatus: (accountId: string) =>
    apiFetch<{
      status: string
      phases: Array<{
        phase_number: number
        profit_current: number
        profit_target: number
        drawdown_current: number
        drawdown_limit: number
        daily_loss_current: number
        daily_loss_limit: number
        trading_days: number
        min_trading_days: number
        is_passed: boolean
        is_breached: boolean
      }>
    }>(`/api/engine/accounts/${accountId}/challenge-status`),
}

// ─── LEADERBOARD ────────────────────────────────
export const leaderboard = {
  get: () =>
    apiFetch<{ entries: LeaderboardEntry[] }>('/api/leaderboard'),
}

// ─── MISC ───────────────────────────────────────
export const misc = {
  getCalendar: () =>
    apiFetch<{ events: CalendarEvent[] }>('/api/misc/calendar'),
}

export interface CalendarEvent {
  id: string
  date: string
  time: string
  currency: string
  impact: 'low' | 'medium' | 'high'
  event: string
  forecast: string
  previous: string
  actual: string | null
}

// ─── AFFILIATE ──────────────────────────────────
export const affiliate = {
  validateCode: (code: string) =>
    apiFetch<{ valid: boolean; program?: string }>(
      `/api/affiliate/validate-code?code=${code}`
    ),

  trackReferral: (code: string) =>
    apiFetch<void>('/api/affiliate/track-referral', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
}

// ─── SHARE LINKS ────────────────────────────────
export const shareLinks = {
  getPosition: (positionId: string) =>
    `/api/share-links/position?id=${positionId}`,

  getPerformance: (accountId: string) =>
    `/api/share-links/performance?account_id=${accountId}`,

  getLeaderboard: (accountId: string) =>
    `/api/share-links/leaderboard?account_id=${accountId}`,
}

// ─── ADMIN ──────────────────────────────────────
export const admin = {
  // Users
  getUsers: (limit = 20, offset = 0, search?: string) => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (search) q.set('search', search)
    return apiFetch<{ users: AdminUser[]; total: number }>(`/api/admin/users?${q}`)
  },

  getUser: (userId: string) =>
    apiFetch<{ user: AdminUser }>(`/api/admin/users/${userId}`),

  banUser: (userId: string, reason: string) =>
    apiFetch<void>(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unbanUser: (userId: string) =>
    apiFetch<void>(`/api/admin/users/${userId}/unban`, { method: 'POST' }),

  // Accounts
  getAccounts: (limit = 20, offset = 0, filters?: Record<string, string>) => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset), ...filters })
    return apiFetch<{ accounts: AdminAccount[]; total: number }>(`/api/admin/accounts?${q}`)
  },

  // Instruments
  getInstruments: (limit = 50, offset = 0) =>
    apiFetch<{ instruments: AdminInstrument[]; total: number }>(
      `/api/admin/instruments?limit=${limit}&offset=${offset}`
    ),

  updateInstrument: (id: string, data: Partial<AdminInstrument>) =>
    apiFetch<{ instrument: AdminInstrument }>(`/api/admin/instruments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Challenge templates
  getTemplates: () =>
    apiFetch<{ templates: ChallengeTemplate[] }>('/api/admin/challenge-templates'),

  getTemplate: (id: string) =>
    apiFetch<{ template: ChallengeTemplate }>(`/api/admin/challenge-templates/${id}`),

  createTemplate: (data: Partial<ChallengeTemplate>) =>
    apiFetch<{ template: ChallengeTemplate }>('/api/admin/challenge-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTemplate: (id: string, data: Partial<ChallengeTemplate>) =>
    apiFetch<{ template: ChallengeTemplate }>(`/api/admin/challenge-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Affiliates
  getAffiliates: (limit = 20, offset = 0) =>
    apiFetch<{ affiliates: Affiliate[] }>(`/api/admin/affiliates?limit=${limit}&offset=${offset}`),
}

// ─── ADMIN GOD MODE ─────────────────────────────
export const godMode = {
  // Game Designer
  gameDesigner: {
    getTemplates: () =>
      apiFetch<{ templates: Array<ChallengeTemplate & { account_count: number }> }>(
        '/api/admin/god-mode/game-designer/challenge-templates'
      ),

    getPhaseConversions: (challengeType?: string) => {
      const q = challengeType ? `?challenge_type=${challengeType}` : ''
      return apiFetch<PhaseConversionResponse>(
        `/api/admin/god-mode/game-designer/phase-conversions${q}`
      )
    },

    getTemplateComparison: () =>
      apiFetch<{ templates: TemplateComparisonEntry[] }>(
        '/api/admin/god-mode/game-designer/template-comparison'
      ),

    getInsights: () =>
      apiFetch<{ insights: GameDesignerInsight[] }>(
        '/api/admin/god-mode/game-designer/insights'
      ),
  },
}
