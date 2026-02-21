'use client'

import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { Search, Star, Filter } from 'lucide-react'
import { cn, formatPrice, calcSpread } from '@/lib/utils'
import { useInstruments } from '@/lib/hooks'
import { useLivePrices } from '@/lib/price-store'
import type { Instrument } from '@/types'

interface WatchlistPanelProps {
  selectedSymbol: string
  onSelectSymbol: (symbol: string) => void
}

const FALLBACK: Instrument[] = [
  { id: 'BTC-USD', symbol: 'BTC-USD', instrument_type: 'crypto', base_currency: 'BTC', quote_currency: 'USD', margin_requirement: 0.01, min_order_size: 0.001, max_leverage: 20, tick_size: 0.01, lot_size: 0.001, price_decimals: 2, qty_decimals: 3, is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false, current_price: 95420.50, current_bid: 95419.00, current_ask: 95421.00, mark_price: 95420.50, funding_rate: -0.0002, next_funding_time: 0, last_updated: 0 },
  { id: 'ETH-USD', symbol: 'ETH-USD', instrument_type: 'crypto', base_currency: 'ETH', quote_currency: 'USD', margin_requirement: 0.01, min_order_size: 0.001, max_leverage: 20, tick_size: 0.01,  lot_size: 0.001, price_decimals: 2, qty_decimals: 2, is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false, current_price: 3450.25, current_bid: 3449.75, current_ask: 3450.75, mark_price: 3450.25, funding_rate: -0.0002, next_funding_time: 0, last_updated: 0 },
]

// ─── TradingView-style price cell ────────────────────────────────────────────
//
// TradingView behavior:
//   • Price cell has a PERSISTENT background color (green for up-tick, red for down-tick)
//   • On a new tick, the background briefly flashes brighter (100ms), then settles to dim tint
//   • The background does NOT fade to neutral — it STAYS colored until the next tick
//   • Direction is determined by comparing current price to PREVIOUS price (not open)
//   • All digits use the same color (bright text on tick, then dimmer text between ticks)
//   • Numbers are displayed in monospace with comma separators for thousands
//

function formatWatchlistPrice(value: number, decimals: number): string {
  // Format with commas for thousands + fixed decimals
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function TickerPrice({ value, decimals }: { value: number; decimals: number }) {
  const prevValueRef = useRef(value)
  const prevStrRef = useRef(formatWatchlistPrice(value, decimals))
  const flashRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Persistent direction — stays until next tick changes it
  const [dir, setDir] = useState<'up' | 'down' | null>(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [changedDigits, setChangedDigits] = useState<Set<number>>(new Set())

  const str = formatWatchlistPrice(value, decimals)

  useEffect(() => {
    if (value === prevValueRef.current) return

    const newDir: 'up' | 'down' = value > prevValueRef.current ? 'up' : 'down'
    const prev = prevStrRef.current
    const newStr = formatWatchlistPrice(value, decimals)

    // Find which digits changed
    const changed = new Set<number>()
    for (let i = 0; i < newStr.length; i++) {
      if (i >= prev.length || newStr[i] !== prev[i]) changed.add(i)
    }

    prevValueRef.current = value
    prevStrRef.current = newStr

    // Set PERSISTENT direction (stays until next opposite tick)
    setDir(newDir)
    setChangedDigits(changed)

    // Flash brighter for 200ms then dim
    setIsFlashing(true)
    flashRef.current = true

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsFlashing(false)
      setChangedDigits(new Set())
      flashRef.current = false
    }, 200)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, decimals])

  return (
    <span
      className={cn(
        'inline-flex items-center tabular-nums rounded-[3px] px-1 py-[1px] transition-all',
        // PERSISTENT background — stays until direction changes
        dir === 'up' && (isFlashing ? 'bg-[#26a69a]/25' : 'bg-[#26a69a]/12'),
        dir === 'down' && (isFlashing ? 'bg-[#ef5350]/25' : 'bg-[#ef5350]/12'),
        // Brief bright flash on tick
        isFlashing ? 'duration-0' : 'duration-300',
      )}
    >
      {str.split('').map((char, i) => (
        <span
          key={i}
          className={cn(
            'inline-block transition-colors',
            dir === 'up'
              ? (isFlashing && changedDigits.has(i)
                  ? 'text-[#26a69a] font-semibold duration-0'
                  : 'text-[#26a69a] duration-200')
              : dir === 'down'
                ? (isFlashing && changedDigits.has(i)
                    ? 'text-[#ef5350] font-semibold duration-0'
                    : 'text-[#ef5350] duration-200')
                : 'text-foreground duration-300'
          )}
        >
          {char}
        </span>
      ))}
    </span>
  )
}

// ─── 24h change display (persistent color) ────────────────────────────────────

function PriceChange({ value, prevClose }: { value: number; prevClose: number }) {
  if (!prevClose || prevClose === 0) return null
  const pct = ((value - prevClose) / prevClose) * 100
  const isUp = pct >= 0
  return (
    <span className={cn(
      'text-[10px] tabular-nums font-medium',
      isUp ? 'text-[#26a69a]' : 'text-[#ef5350]'
    )}>
      {isUp ? '+' : ''}{pct.toFixed(2)}%
    </span>
  )
}

// ─── Single instrument row ─────────────────────────────────────────────────────

const InstrumentRow = memo(function InstrumentRow({
  instrument,
  livePrice,
  isSelected,
  isBookmarked,
  onSelect,
  onToggleBookmark,
}: {
  instrument: Instrument
  livePrice: number
  isSelected: boolean
  isBookmarked: boolean
  onSelect: () => void
  onToggleBookmark: (e: React.MouseEvent) => void
}) {
  const price = livePrice > 0 ? livePrice : instrument.current_price
  const spread = livePrice > 0
    ? instrument.instrument_type === 'forex'
      ? 0.00003 * 2
      : price * 0.00015 * 2
    : calcSpread(instrument.current_bid, instrument.current_ask, instrument.price_decimals)

  // Crypto icon URL
  const base = instrument.base_currency.toLowerCase()
  const isCrypto = instrument.instrument_type === 'crypto'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between px-2.5 py-[7px] hover:bg-white/[0.04] transition-colors group',
        isSelected && 'bg-[#2962ff]/8 border-l-2 border-[#2962ff]'
      )}
    >
      {/* Symbol */}
      <div className="flex items-center gap-2 min-w-0">
        {isCrypto ? (
          <img
            src={`https://assets.coincap.io/assets/icons/${base}@2x.png`}
            alt={base}
            className="w-5 h-5 rounded-full shrink-0"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              el.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        {(!isCrypto || true) && (
          <div className={cn(
            'w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0 uppercase',
            isCrypto && 'hidden'
          )}>
            {instrument.base_currency.slice(0, 2)}
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="text-[11px] font-semibold text-foreground leading-tight">{instrument.symbol}</span>
          <span className="text-[9px] text-muted-foreground/60 leading-tight">
            {isCrypto ? 'Crypto' : 'Forex'}
          </span>
        </div>
      </div>

      {/* Price + spread + change */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[11px] font-medium leading-tight">
            <TickerPrice value={price} decimals={instrument.price_decimals} />
          </span>
          <span className="text-[9px] text-muted-foreground/50 tabular-nums leading-tight">
            Spr: {spread.toFixed(Math.min(instrument.price_decimals, 2))}
          </span>
        </div>
        <button
          onClick={onToggleBookmark}
          className={cn(
            'p-0.5 rounded transition-all opacity-0 group-hover:opacity-100',
            isBookmarked ? 'text-[#2962ff] !opacity-100' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Star className={cn('size-3', isBookmarked && 'fill-current')} />
        </button>
      </div>
    </button>
  )
})

// ─── Main panel ────────────────────────────────────────────────────────────────

export function WatchlistPanel({ selectedSymbol, onSelectSymbol }: WatchlistPanelProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'watchlist' | 'all'>('all')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  const { data: instruments } = useInstruments()
  const livePrices = useLivePrices()
  const list = instruments ?? FALLBACK

  const filtered = list.filter(i =>
    i.symbol.toLowerCase().includes(search.toLowerCase())
  )
  const displayed = activeTab === 'watchlist'
    ? filtered.filter(i => bookmarks.has(i.symbol))
    : filtered

  const toggleBookmark = useCallback((symbol: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border/50 shrink-0">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
            activeTab === 'watchlist' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Star className="size-3" />
          Watchlist
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
            activeTab === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All
          <span className="text-[10px] bg-muted-foreground/20 rounded px-1">{list.length}</span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol..."
            className="bg-transparent focus:outline-none flex-1 text-xs font-medium text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="px-2.5 py-1 shrink-0 border-b border-border/50">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/70 font-medium uppercase tracking-wider">
          <span>Symbol</span>
          <div className="flex items-center gap-4">
            <span>Last Price</span>
          </div>
        </div>
      </div>

      {/* Instrument rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayed.length === 0 && activeTab === 'watchlist' && (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <Star className="size-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">No watchlist items</p>
            <p className="text-[10px] text-muted-foreground/40">Star instruments to add them</p>
          </div>
        )}
        {displayed.length === 0 && activeTab === 'all' && search && (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <Search className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">No results for &quot;{search}&quot;</p>
          </div>
        )}
        {displayed.map(instrument => (
          <InstrumentRow
            key={instrument.id}
            instrument={instrument}
            livePrice={livePrices[instrument.symbol] ?? 0}
            isSelected={instrument.symbol === selectedSymbol}
            isBookmarked={bookmarks.has(instrument.symbol)}
            onSelect={() => onSelectSymbol(instrument.symbol)}
            onToggleBookmark={(e) => toggleBookmark(instrument.symbol, e)}
          />
        ))}
      </div>
    </div>
  )
}
