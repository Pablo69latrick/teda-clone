/**
 * Binance WebSocket Price Manager — real-time crypto prices.
 *
 * Singleton stored in globalThis for cross-route sharing in Next.js.
 * Connects to Binance combined stream (free, no API key) and maintains
 * an in-memory price map for all 11 crypto pairs.
 *
 * Forex pairs (EUR-USD, GBP-USD, AUD-USD) are NOT available on Binance.
 * They fall back to the CoinGecko/Twelve Data cron prices in price_cache.
 *
 * Usage:
 *   import { getBinancePrices } from '@/lib/binance-prices'
 *   const manager = getBinancePrices()
 *   const prices = manager.getAll()   // { 'BTC-USD': 67997.12, ... }
 */

// ─── Symbol mapping: VerticalProp → Binance ─────────────────────────────────

const VP_TO_BINANCE: Record<string, string> = {
  'BTC-USD':   'btcusdt',
  'ETH-USD':   'ethusdt',
  'SOL-USD':   'solusdt',
  'XRP-USD':   'xrpusdt',
  'ADA-USD':   'adausdt',
  'DOGE-USD':  'dogeusdt',
  'LINK-USD':  'linkusdt',
  'ARB-USD':   'arbusdt',
  '1INCH-USD': '1inchusdt',
  'AAVE-USD':  'aaveusdt',
  // ASTER-USD: not listed on Binance, falls back to CoinGecko cron
}

const BINANCE_TO_VP: Record<string, string> = {}
for (const [vp, bn] of Object.entries(VP_TO_BINANCE)) {
  BINANCE_TO_VP[bn] = vp
}

// ─── Price entry type ────────────────────────────────────────────────────────

export interface PriceEntry {
  current_price: number
  current_bid: number
  current_ask: number
  mark_price: number
  funding_rate: number
  last_updated: number
}

// ─── Manager class ──────────────────────────────────────────────────────────

class BinancePriceManager {
  private prices = new Map<string, PriceEntry>()
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false

  get connected() { return this._connected }
  get symbolCount() { return this.prices.size }

  /** Start the WebSocket connection to Binance combined stream */
  connect() {
    if (this.ws) return

    const streams = Object.values(VP_TO_BINANCE).map(s => `${s}@miniTicker`).join('/')
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

    try {
      this.ws = new WebSocket(url)
    } catch (err) {
      console.error('[Binance WS] Failed to create WebSocket:', err)
      this.scheduleReconnect()
      return
    }

    this.ws.addEventListener('open', () => {
      this._connected = true
      console.log(`[Binance WS] Connected — streaming ${Object.keys(VP_TO_BINANCE).length} crypto pairs`)
    })

    this.ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : '')
        const data = msg.data
        if (!data?.s) return

        const binanceSymbol = data.s.toLowerCase()
        const vpSymbol = BINANCE_TO_VP[binanceSymbol]
        if (!vpSymbol) return

        const price = parseFloat(data.c) // close price
        if (!price || isNaN(price)) return

        // Spread: 0.015% for crypto (same as our cron)
        const spread = price * 0.00015

        this.prices.set(vpSymbol, {
          current_price: price,
          current_bid:   +(price - spread).toFixed(8),
          current_ask:   +(price + spread).toFixed(8),
          mark_price:    price,
          funding_rate:  -0.0002,
          last_updated:  Date.now(),
        })
      } catch {
        // ignore parse errors
      }
    })

    this.ws.addEventListener('close', () => {
      this._connected = false
      this.ws = null
      console.log('[Binance WS] Disconnected')
      this.scheduleReconnect()
    })

    this.ws.addEventListener('error', () => {
      this.ws?.close()
    })
  }

  /** Get all prices as a flat map { 'BTC-USD': 67997.12, ... } */
  getAll(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [symbol, entry] of this.prices) {
      result[symbol] = entry.current_price
    }
    return result
  }

  /** Get detailed price entries for Supabase upsert / SSE push */
  getDetailed(): Array<{ symbol: string } & PriceEntry> {
    return Array.from(this.prices.entries()).map(([symbol, entry]) => ({
      symbol,
      ...entry,
    }))
  }

  /** Get a single price entry */
  getPrice(vpSymbol: string): PriceEntry | undefined {
    return this.prices.get(vpSymbol)
  }

  /** Check if we have a price for a given symbol */
  hasPrice(vpSymbol: string): boolean {
    return this.prices.has(vpSymbol)
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      console.log('[Binance WS] Reconnecting...')
      this.connect()
    }, 3000)
  }

  /** Clean shutdown */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._connected = false
  }
}

// ─── Singleton via globalThis ────────────────────────────────────────────────

const G = globalThis as unknown as { __binancePrices?: BinancePriceManager }

export function getBinancePrices(): BinancePriceManager {
  if (!G.__binancePrices) {
    G.__binancePrices = new BinancePriceManager()
    G.__binancePrices.connect()
  }
  return G.__binancePrices
}

/** Symbols that Binance covers */
export const BINANCE_SYMBOLS = Object.keys(VP_TO_BINANCE)

/** Symbols that need fallback (forex, unlisted) */
export const FALLBACK_SYMBOLS = ['EUR-USD', 'GBP-USD', 'AUD-USD', 'ASTER-USD']
