'use client'

/**
 * Watchlist panel — TradingView-exact layout and tick behavior.
 *
 * Features:
 *   • Columns: Symb | Last | Chg | Chg%
 *   • Collapsible category groups (CRYPTO, FOREX)
 *   • Persistent green/red row backgrounds on tick (doesn't fade to neutral)
 *   • 250ms bright flash on new tick, then settles to dim persistent tint
 *   • Price/change text colored per tick direction
 *   • Session-based change: first received price → current live price
 *   • TradingView color palette: #26a69a green, #ef5350 red, #2962ff selection
 */

import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
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

const FALLBACK: Instrument[] = [
  { id: 'BTC-USD', symbol: 'BTC-USD', instrument_type: 'crypto', base_currency: 'BTC', quote_currency: 'USD', margin_requirement: 0.01, min_order_size: 0.001, max_leverage: 20, tick_size: 0.01, lot_size: 0.001, price_decimals: 2, qty_decimals: 3, is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false, current_price: 95420.50, current_bid: 95419.00, current_ask: 95421.00, mark_price: 95420.50, funding_rate: -0.0002, next_funding_time: 0, last_updated: 0 },
  { id: 'ETH-USD', symbol: 'ETH-USD', instrument_type: 'crypto', base_currency: 'ETH', quote_currency: 'USD', margin_requirement: 0.01, min_order_size: 0.001, max_leverage: 20, tick_size: 0.01, lot_size: 0.001, price_decimals: 2, qty_decimals: 2, is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false, current_price: 3450.25, current_bid: 3449.75, current_ask: 3450.75, mark_price: 3450.25, funding_rate: -0.0002, next_funding_time: 0, last_updated: 0 },
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
        'w-full grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 px-2.5 py-[6px] text-[11px] tabular-nums transition-all',
        // Persistent row background — stays colored until next tick
        dir === 'up' && (flash ? 'bg-[#26a69a]/18' : 'bg-[#26a69a]/[0.05]'),
        dir === 'down' && (flash ? 'bg-[#ef5350]/18' : 'bg-[#ef5350]/[0.05]'),
        dir === null && 'hover:bg-white/[0.03]',
        // Selected row
        isSelected && '!bg-[#2962ff]/10',
        // Transition timing
        flash ? 'duration-0' : 'duration-300',
      )}
    >
      {/* ── Symbol column ── */}
      <div className="flex items-center gap-1.5 min-w-0 text-left">
        <span
          className={cn(
            'w-[6px] h-[6px] rounded-full shrink-0',
            isCrypto ? 'bg-[#f0b90b]' : 'bg-[#2962ff]'
          )}
        />
        <span className="font-medium text-[#d1d4dc] truncate leading-none">{sym}</span>
      </div>

      {/* ── Last price ── */}
      <span
        className={cn(
          'text-right font-medium leading-none',
          dir === 'up' ? 'text-[#26a69a]' : dir === 'down' ? 'text-[#ef5350]' : 'text-[#d1d4dc]',
        )}
      >
        {fmtPrice(price, dec)}
      </span>

      {/* ── Change (absolute) ── */}
      <span
        className={cn(
          'text-right leading-none min-w-[50px]',
          change >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]',
        )}
      >
        {fmtChange(change, dec)}
      </span>

      {/* ── Change% ── */}
      <span
        className={cn(
          'text-right leading-none min-w-[46px]',
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
      className="w-full flex items-center gap-1 px-2.5 py-[6px] text-[10px] font-bold text-[#787b86] hover:text-[#d1d4dc] transition-colors uppercase tracking-wider border-b border-[#2a2e39]/50"
    >
      {isOpen ? (
        <ChevronDown className="size-3 shrink-0" />
      ) : (
        <ChevronRight className="size-3 shrink-0" />
      )}
      <span>{label}</span>
      <span className="text-[#787b86]/40 text-[9px] ml-1">{count}</span>
    </button>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export function WatchlistPanel({ selectedSymbol, onSelectSymbol }: WatchlistPanelProps) {
  const [search, setSearch] = useState('')
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
    <div className="flex flex-col h-full overflow-hidden bg-[#131722]">
      {/* ── Search ── */}
      <div className="px-2 py-1.5 shrink-0 border-b border-[#2a2e39]">
        <div className="flex items-center gap-2 bg-[#1e222d] rounded px-2 py-[5px]">
          <Search className="size-3.5 text-[#787b86] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-transparent focus:outline-none flex-1 text-[11px] font-medium text-[#d1d4dc] placeholder:text-[#787b86]/50"
          />
        </div>
      </div>

      {/* ── Column headers ── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 px-2.5 py-[5px] shrink-0 border-b border-[#2a2e39]">
        <span className="text-[9px] text-[#787b86]/60 font-semibold uppercase tracking-wider">
          Symb
        </span>
        <span className="text-[9px] text-[#787b86]/60 font-semibold uppercase tracking-wider text-right">
          Last
        </span>
        <span className="text-[9px] text-[#787b86]/60 font-semibold uppercase tracking-wider text-right min-w-[50px]">
          Chg
        </span>
        <span className="text-[9px] text-[#787b86]/60 font-semibold uppercase tracking-wider text-right min-w-[46px]">
          Chg%
        </span>
      </div>

      {/* ── Rows ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {search ? (
          // Flat list when searching
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
              <Search className="size-5 text-[#787b86]/30" />
              <p className="text-[11px] text-[#787b86]/50">No results for &quot;{search}&quot;</p>
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
          // Grouped by category
          CATEGORIES.map(cat => {
            const items = filtered.filter(cat.filter)
            if (items.length === 0) return null
            const isOpen = openCats[cat.id] !== false
            return (
              <div key={cat.id}>
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
    </div>
  )
}
