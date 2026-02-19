import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Tailwind class merger ─────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Number formatting ─────────────────────────
export function formatCurrency(
  value: number,
  currency = 'USD',
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return formatNumber(value)
}

// ─── Price formatting ──────────────────────────
export function formatPrice(value: number, decimals = 5): string {
  return value.toFixed(decimals)
}

export function formatPnl(value: number, currency = '$'): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${currency}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Date formatting ──────────────────────────
export function formatTimestamp(ts: number): string {
  // ts can be Unix ms or Unix seconds
  const ms = ts > 1e12 ? ts : ts * 1000
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ms))
}

export function timeAgo(ts: number): string {
  const ms = ts > 1e12 ? ts : ts * 1000
  const diff = Date.now() - ms
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Trading math ──────────────────────────────
export function calcLiquidationPrice(
  direction: 'long' | 'short',
  entryPrice: number,
  leverage: number,
  maintenanceMargin = 0.005
): number {
  if (direction === 'long') {
    return entryPrice * (1 - 1 / leverage + maintenanceMargin)
  }
  return entryPrice * (1 + 1 / leverage - maintenanceMargin)
}

export function calcRequiredMargin(
  quantity: number,
  entryPrice: number,
  leverage: number
): number {
  return (quantity * entryPrice) / leverage
}

export function calcPnl(
  direction: 'long' | 'short',
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  fees = 0
): number {
  if (direction === 'long') {
    return (currentPrice - entryPrice) * quantity - fees
  }
  return (entryPrice - currentPrice) * quantity - fees
}

export function calcPnlPercent(pnl: number, margin: number): number {
  if (margin === 0) return 0
  return (pnl / margin) * 100
}

export function calcSpread(bid: number, ask: number, decimals = 5): number {
  return parseFloat((ask - bid).toFixed(decimals))
}

// ─── Account helpers ───────────────────────────
export function getAccountStatusColor(status: string): string {
  switch (status) {
    case 'active':   return 'text-profit'
    case 'funded':   return 'text-chart-1'
    case 'passed':   return 'text-chart-2'
    case 'breached': return 'text-loss'
    case 'closed':   return 'text-muted-foreground'
    default:         return 'text-foreground'
  }
}

export function getAccountStatusBadge(status: string): string {
  switch (status) {
    case 'active':   return 'bg-profit/10 text-profit border-profit/20'
    case 'funded':   return 'bg-chart-1/10 text-chart-1 border-chart-1/20'
    case 'passed':   return 'bg-chart-2/10 text-chart-2 border-chart-2/20'
    case 'breached': return 'bg-loss/10 text-loss border-loss/20'
    case 'closed':   return 'bg-muted text-muted-foreground border-border'
    default:         return 'bg-muted text-muted-foreground border-border'
  }
}

// ─── Symbol helpers ────────────────────────────
export function getBaseAsset(symbol: string): string {
  return symbol.split('-')[0] ?? symbol
}

export function getQuoteAsset(symbol: string): string {
  return symbol.split('-')[1] ?? 'USD'
}

export function getCryptoIconUrl(symbol: string): string {
  const base = getBaseAsset(symbol).toLowerCase()
  return `https://assets.coincap.io/assets/icons/${base}@2x.png`
}

// ─── Challenge helpers ─────────────────────────
export function formatChallengeType(type: string): string {
  switch (type) {
    case 'instant': return 'Instant Funding'
    case '1-step':  return '1-Step'
    case '2-step':  return '2-Step'
    default:        return type
  }
}

export function calcChallengeProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.max(0, (current / target) * 100))
}

// ─── Misc ─────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function truncateAddress(addr: string, chars = 6): string {
  if (addr.length <= chars * 2) return addr
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`
}
