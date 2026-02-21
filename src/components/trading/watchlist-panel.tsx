'use client'

import { useState, useRef, useEffect, memo } from 'react'
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
  { id: 'BTC-USD', symbol: 'BTC-USD', instrument_type: 'crypto', base_currency: 'BTC', quote_currency: 'USD', margin_requirement: 0.01, min_order_size: 0.001, max_leverage: 20, tick_size: 0.1, lot_size: 0.001, price_decimals: 1, qty_decimals: 3, is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false, current_price: 95420.5, current_bid: 95419.0, current_ask: 95421.0, mark_price: 95420.5, funding_rate: -0.0002, next_funding_time: 0, last_updated: 0 },
  { id: 'ETH-USD', symbol: 'ETH-USD', instrument_type: 'crypto', base_currency: 'ETH', quote_currency: 'USD', margin_requirement: 0.01, min_order_size: 0.001, max_leverage: 20, tick_size: 0.01,  lot_size: 0.001, price_decimals: 2, qty_decimals: 2, is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false, current_price: 3450.25, current_bid: 3449.75, current_ask: 3450.75, mark_price: 3450.25, funding_rate: -0.0002, next_funding_time: 0, last_updated: 0 },
]

// ─── TradingView-style animated price display ─────────────────────────────────
// Shows per-digit highlighting on price changes with directional flash.
// Changed digits get bright green/red, unchanged digits get a dimmer tint.
// The flash fades out via CSS transition over ~300ms.

function TickerPrice({ value, decimals }: { value: number; decimals: number }) {
  const prevValueRef = useRef(value)
  const prevStrRef = useRef(formatPrice(value, decimals))
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const [tick, setTick] = useState<{
    dir: 'up' | 'down' | null
    changed: Set<number>
  }>({ dir: null, changed: new Set() })

  const str = formatPrice(value, decimals)

  useEffect(() => {
    if (value === prevValueRef.current) return

    const dir: 'up' | 'down' = value > prevValueRef.current ? 'up' : 'down'
    const prev = prevStrRef.current
    const newStr = formatPrice(value, decimals)

    const changed = new Set<number>()
    for (let i = 0; i < newStr.length; i++) {
      if (i >= prev.length || newStr[i] !== prev[i]) changed.add(i)
    }

    prevValueRef.current = value
    prevStrRef.current = newStr

    setTick({ dir, changed })

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setTick({ dir: null, changed: new Set() })
    }, 350)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, decimals])

  return (
    <span
      className={cn(
        'inline-flex tabular-nums rounded-sm px-0.5 transition-all duration-300',
        tick.dir === 'up'   && 'bg-profit/10',
        tick.dir === 'down' && 'bg-loss/10',
      )}
    >
      {str.split('').map((char, i) => (
        <span
          key={i}
          className={cn(
            'inline-block transition-colors',
            tick.dir && tick.changed.has(i)
              // Changed digits: bright color + brief pop
              ? cn(
                  tick.dir === 'up' ? 'text-profit' : 'text-loss',
                  'duration-100 font-semibold'
                )
              // Unchanged digits during flash: dimmer tint
              : tick.dir
                ? cn(
                    tick.dir === 'up' ? 'text-profit/60' : 'text-loss/60',
                    'duration-150'
                  )
                // Neutral state: smooth fade back
                : 'text-foreground duration-[400ms]'
          )}
        >
          {char}
        </span>
      ))}
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

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors group',
        isSelected && 'bg-primary/5 border-l-2 border-primary'
      )}
    >
      {/* Symbol */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
          {instrument.symbol[0]}
        </div>
        <span className="text-xs font-medium text-foreground">{instrument.symbol}</span>
      </div>

      {/* Price + spread */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium">
          <TickerPrice value={price} decimals={instrument.price_decimals} />
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
          {spread.toFixed(Math.min(instrument.price_decimals, 2))}
        </span>
        <button
          onClick={onToggleBookmark}
          className={cn(
            'p-0.5 rounded transition-all opacity-0 group-hover:opacity-100',
            isBookmarked ? 'text-primary !opacity-100' : 'text-muted-foreground hover:text-foreground'
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

  const toggleBookmark = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

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
          <button className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <Star className="size-3.5" />
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
            placeholder="Search..."
            className="bg-transparent focus:outline-none flex-1 text-xs font-medium text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Watchlist group */}
      <div className="px-3 py-1.5 shrink-0 border-b border-border/40">
        <button className="flex items-center gap-1 text-xs font-medium text-foreground">
          <span className="text-[10px] text-muted-foreground">▾</span>
          Trading platform
          <span className="text-[10px] text-muted-foreground ml-1">{bookmarks.size}</span>
        </button>
        {bookmarks.size === 0 && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5 text-center">
            Drop instruments here
          </p>
        )}
      </div>

      {/* All group header */}
      <div className="px-3 py-1 shrink-0 border-b border-border/50">
        <div className="flex items-center gap-1 text-xs font-semibold text-foreground pb-1">
          <span className="text-[10px] text-muted-foreground">▾</span>
          All
          <span className="text-[10px] text-muted-foreground font-normal ml-1">{filtered.length}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          <span>Instruments</span>
          <div className="flex items-center gap-5">
            <span>Price</span>
            <span>Spread</span>
          </div>
        </div>
      </div>

      {/* Instrument rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayed.length === 0 && activeTab === 'watchlist' && (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <Star className="size-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">No watchlist items</p>
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
