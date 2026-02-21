'use client'

/**
 * Watchlist panel — TradingView right-sidebar style.
 *
 * Features:
 *   • TradingView header with title + icon
 *   • Columns: Symb | Last | Chg | Chg%
 *   • Collapsible category groups (CRYPTO, FOREX)
 *   • Persistent green/red row backgrounds on tick (doesn't fade to neutral)
 *   • 250ms bright flash on new tick, then settles to dim persistent tint
 *   • Hover preselection: blue left border + illuminated background
 *   • Price/change text colored per tick direction
 *   • Session-based change: first received price → current live price
 *   • TradingView color palette: #26a69a green, #ef5350 red, #2962ff selection
 */

import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { Search, ChevronDown, ChevronRight, LayoutList, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInstruments } from '@/lib/hooks'
import { useLivePrices } from '@/lib/price-store'
import type { Instrument } from '@/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WatchlistPanelProps {
  selectedSymbol: string
  onSelectSymbol: (symbol: string) => void
}

// ─── Fallback instruments (before API loads) ────────────────────────────────

const _fb = (id: string, sym: string, type: 'crypto' | 'forex', base: string, dec: number, price: number): Instrument => ({
  id, symbol: sym, instrument_type: type, base_currency: base, quote_currency: 'USD',
  margin_requirement: type === 'forex' ? 0.001 : 0.01, min_order_size: 0.01, max_leverage: type === 'forex' ? 100 : 20,
  tick_size: Math.pow(10, -dec), lot_size: 0.001, price_decimals: dec, qty_decimals: 2,
  is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false,
  current_price: price, current_bid: price, current_ask: price, mark_price: price,
  funding_rate: -0.0002, next_funding_time: 0, last_updated: 0,
})

const FALLBACK: Instrument[] = [
  _fb('1INCH-USD', '1INCH-USD', 'crypto', '1INCH', 5, 0.0938),
  _fb('AAVE-USD',  'AAVE-USD',  'crypto', 'AAVE',  3, 115.45),
  _fb('ADA-USD',   'ADA-USD',   'crypto', 'ADA',   4, 0.285),
  _fb('ARB-USD',   'ARB-USD',   'crypto', 'ARB',   5, 0.0967),
  _fb('ASTER-USD', 'ASTER-USD', 'crypto', 'ASTER', 5, 0.0075),
  _fb('AUD-USD',   'AUD-USD',   'forex',  'AUD',   5, 0.6959),
  _fb('BTC-USD',   'BTC-USD',   'crypto', 'BTC',   2, 67971.44),
  _fb('DOGE-USD',  'DOGE-USD',  'crypto', 'DOGE',  5, 0.10004),
  _fb('ETH-USD',   'ETH-USD',   'crypto', 'ETH',   2, 1967.92),
  _fb('EUR-USD',   'EUR-USD',   'forex',  'EUR',   5, 1.0842),
  _fb('GBP-USD',   'GBP-USD',   'forex',  'GBP',   5, 1.2675),
  _fb('LINK-USD',  'LINK-USD',  'crypto', 'LINK',  4, 8.95),
  _fb('SOL-USD',   'SOL-USD',   'crypto', 'SOL',   3, 84.69),
  _fb('XRP-USD',   'XRP-USD',   'crypto', 'XRP',   5, 1.4258),
]

// ─── Category definitions ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'crypto', label: 'CRYPTO', filter: (i: Instrument) => i.instrument_type === 'crypto' },
  { id: 'forex',  label: 'FOREX',  filter: (i: Instrument) => i.instrument_type === 'forex' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format price with comma separators + fixed decimals */
function fmtPrice(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format absolute change: smart decimals based on magnitude */
function fmtChange(value: number, priceDec: number): string {
  const abs = Math.abs(value)
  const maxDec = Math.max(2, Math.min(5, priceDec))
  const str = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDec,
  })
  return (value >= 0 ? '+' : '-') + str
}

/** Abbreviated ticker: BTC-USD → BTC, EUR-USD → EURUSD */
function ticker(inst: Instrument): string {
  return inst.instrument_type === 'forex'
    ? inst.symbol.replace('-', '')
    : inst.base_currency
}

// ─── TradingView-style row with persistent tick color ───────────────────────

const TickerRow = memo(function TickerRow({
  instrument,
  livePrice,
  basePrice,
  isSelected,
  onSelect,
}: {
  instrument: Instrument
  livePrice: number
  basePrice: number
  isSelected: boolean
  onSelect: () => void
}) {
  const price = livePrice > 0 ? livePrice : instrument.current_price
  const prevRef = useRef(price)

  // Persistent direction — stays until the next opposite tick
  const [dir, setDir] = useState<'up' | 'down' | null>(null)
  const [flash, setFlash] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Session change
  const change = basePrice > 0 ? price - basePrice : 0
  const changePct = basePrice > 0 ? (change / basePrice) * 100 : 0

  useEffect(() => {
    if (price === prevRef.current) return
    const newDir = price > prevRef.current ? 'up' : 'down'
    prevRef.current = price

    setDir(newDir)
    setFlash(true)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFlash(false), 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [price])

  const sym = ticker(instrument)
  const isCrypto = instrument.instrument_type === 'crypto'
  const dec = instrument.price_decimals

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 px-2.5 py-[5px] text-[11px] tabular-nums transition-all cursor-pointer group',
        // Left border for hover preselection + selected state
        'border-l-2 border-l-transparent',
        'hover:bg-[#1e222d] hover:border-l-[#2962ff]/70',
        // Persistent row background — stays colored until next tick
        dir === 'up' && (flash ? 'bg-[#26a69a]/18' : 'bg-[#26a69a]/[0.04]'),
        dir === 'down' && (flash ? 'bg-[#ef5350]/18' : 'bg-[#ef5350]/[0.04]'),
        // Selected row
        isSelected && '!bg-[#2962ff]/[0.08] !border-l-[#2962ff]',
        // Transition timing
        flash ? 'duration-0' : 'duration-150',
      )}
    >
      {/* ── Symbol column ── */}
      <div className="flex items-center gap-1.5 min-w-0 text-left">
        <span
          className={cn(
            'w-[5px] h-[5px] rounded-full shrink-0',
            isCrypto ? 'bg-[#f0b90b]' : 'bg-[#2962ff]'
          )}
        />
        <span className={cn(
          'font-medium truncate leading-none',
          isSelected ? 'text-[#d1d4dc]' : 'text-[#b2b5be] group-hover:text-[#d1d4dc]',
        )}>{sym}</span>
      </div>

      {/* ── Last price ── */}
      <span
        className={cn(
          'text-right font-medium leading-none',
          dir === 'up' ? 'text-[#26a69a]' : dir === 'down' ? 'text-[#ef5350]' : 'text-[#b2b5be]',
        )}
      >
        {fmtPrice(price, dec)}
      </span>

      {/* ── Change (absolute) ── */}
      <span
        className={cn(
          'text-right leading-none min-w-[48px]',
          change >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]',
        )}
      >
        {fmtChange(change, dec)}
      </span>

      {/* ── Change% ── */}
      <span
        className={cn(
          'text-right leading-none min-w-[44px]',
          changePct >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]',
        )}
      >
        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
      </span>
    </button>
  )
})

// ─── Category header (collapsible) ──────────────────────────────────────────

function CategoryHeader({
  label,
  count,
  isOpen,
  onToggle,
}: {
  label: string
  count: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1 px-2.5 py-[5px] text-[10px] font-semibold text-[#787b86] hover:text-[#b2b5be] transition-colors uppercase tracking-wider bg-light-dark/40"
    >
      {isOpen ? (
        <ChevronDown className="size-3 shrink-0" />
      ) : (
        <ChevronRight className="size-3 shrink-0" />
      )}
      <span>{label}</span>
      <span className="text-[#787b86]/40 text-[9px] ml-0.5">{count}</span>
    </button>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export function WatchlistPanel({ selectedSymbol, onSelectSymbol }: WatchlistPanelProps) {
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    crypto: true,
    forex: true,
  })
  const basePricesRef = useRef<Record<string, number>>({})

  const { data: instruments } = useInstruments()
  const livePrices = useLivePrices()
  const list = instruments ?? FALLBACK

  // Capture first price for each symbol as session reference
  useEffect(() => {
    for (const [sym, price] of Object.entries(livePrices)) {
      if (price > 0 && !(sym in basePricesRef.current)) {
        basePricesRef.current[sym] = price
      }
    }
  }, [livePrices])

  const filtered = search
    ? list.filter(
        i =>
          i.symbol.toLowerCase().includes(search.toLowerCase()) ||
          i.base_currency.toLowerCase().includes(search.toLowerCase())
      )
    : list

  const toggleCat = useCallback((id: string) => {
    setOpenCats(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* ── TradingView-style header ── */}
      <div className="flex items-center justify-between px-2.5 py-[7px] shrink-0 border-b border-border">
        <div className="flex items-center gap-1.5">
          <LayoutList className="size-3.5 text-[#787b86]" />
          <span className="text-[11px] font-semibold text-[#d1d4dc] tracking-wide">Watchlist</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowSearch(v => !v)}
            className={cn(
              'p-1 rounded transition-colors',
              showSearch
                ? 'bg-[#2962ff]/15 text-[#2962ff]'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-white/[0.04]',
            )}
            title="Search (Ctrl+F)"
          >
            <Search className="size-3.5" />
          </button>
          <button
            className="p-1 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-white/[0.04] transition-colors"
            title="Favorites"
          >
            <Star className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Search (toggle) ── */}
      {showSearch && (
        <div className="px-2 py-1.5 shrink-0 border-b border-border">
          <div className="flex items-center gap-2 bg-[#1e222d] rounded px-2 py-[4px] border border-border focus-within:border-[#2962ff]/50 transition-colors">
            <Search className="size-3 text-[#787b86] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="bg-transparent focus:outline-none flex-1 text-[11px] font-medium text-[#d1d4dc] placeholder:text-[#787b86]/40"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[#787b86] hover:text-[#d1d4dc] text-[10px] leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Column headers ── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 px-2.5 py-[4px] shrink-0 border-b border-border/60 bg-light-dark/30">
        <span className="text-[9px] text-[#787b86]/50 font-semibold uppercase tracking-wider">
          Symb
        </span>
        <span className="text-[9px] text-[#787b86]/50 font-semibold uppercase tracking-wider text-right">
          Last
        </span>
        <span className="text-[9px] text-[#787b86]/50 font-semibold uppercase tracking-wider text-right min-w-[48px]">
          Chg
        </span>
        <span className="text-[9px] text-[#787b86]/50 font-semibold uppercase tracking-wider text-right min-w-[44px]">
          Chg%
        </span>
      </div>

      {/* ── Rows — standard TradingView layout: header at top, items below ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {search ? (
          // Flat list when searching
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
              <Search className="size-5 text-[#787b86]/20" />
              <p className="text-[11px] text-[#787b86]/40">No results for &quot;{search}&quot;</p>
            </div>
          ) : (
            filtered.map(inst => (
              <TickerRow
                key={inst.id}
                instrument={inst}
                livePrice={livePrices[inst.symbol] ?? 0}
                basePrice={basePricesRef.current[inst.symbol] ?? inst.current_price}
                isSelected={inst.symbol === selectedSymbol}
                onSelect={() => onSelectSymbol(inst.symbol)}
              />
            ))
          )
        ) : (
          // Grouped by category — header on top, items below
          CATEGORIES.map(cat => {
            const items = filtered.filter(cat.filter)
            if (items.length === 0) return null
            const isOpen = openCats[cat.id] !== false
            return (
              <div key={cat.id} className="flex flex-col">
                <CategoryHeader
                  label={cat.label}
                  count={items.length}
                  isOpen={isOpen}
                  onToggle={() => toggleCat(cat.id)}
                />
                {isOpen &&
                  items.map(inst => (
                    <TickerRow
                      key={inst.id}
                      instrument={inst}
                      livePrice={livePrices[inst.symbol] ?? 0}
                      basePrice={basePricesRef.current[inst.symbol] ?? inst.current_price}
                      isSelected={inst.symbol === selectedSymbol}
                      onSelect={() => onSelectSymbol(inst.symbol)}
                    />
                  ))}
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer with shortcut hints ── */}
      <div className="px-2.5 py-[4px] shrink-0 border-t border-border bg-light-dark/30">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#787b86]/40">
            {list.length} instruments
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] text-[#787b86]/30">
              <kbd className="px-1 py-0.5 rounded bg-[#1e222d] text-[#787b86]/50 text-[8px] font-mono">A</kbd>
              <span className="ml-1">assets</span>
            </span>
            <span className="text-[9px] text-[#787b86]/30">
              <kbd className="px-1 py-0.5 rounded bg-[#1e222d] text-[#787b86]/50 text-[8px] font-mono">W</kbd>
              <span className="ml-1">tools</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
