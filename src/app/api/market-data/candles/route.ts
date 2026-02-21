/**
 * GET /api/market-data/candles
 *
 * Proxies Binance kline (candlestick) data for our chart component.
 * Converts VerticalProp symbols (BTC-USD) → Binance format (BTCUSDT).
 *
 * Query params:
 *   symbol    — e.g. BTC-USD (required)
 *   timeframe — 1m | 5m | 15m | 1h | 4h | 1d (default: 1h)
 *   limit     — 1..1500 (default: 500)
 *
 * Returns:
 *   { candles: [{ time, open, high, low, close, volume }], symbol, timeframe }
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Symbol mapping: VerticalProp → Binance ─────────────────────────────────

const VP_TO_BINANCE: Record<string, string> = {
  'BTC-USD':   'BTCUSDT',
  'ETH-USD':   'ETHUSDT',
  'SOL-USD':   'SOLUSDT',
  'XRP-USD':   'XRPUSDT',
  'ADA-USD':   'ADAUSDT',
  'DOGE-USD':  'DOGEUSDT',
  'LINK-USD':  'LINKUSDT',
  'ARB-USD':   'ARBUSDT',
  '1INCH-USD': '1INCHUSDT',
  'AAVE-USD':  'AAVEUSDT',
}

// ─── Valid timeframes ────────────────────────────────────────────────────────

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
type Timeframe = (typeof VALID_TIMEFRAMES)[number]

// ─── In-memory cache (avoid hammering Binance) ──────────────────────────────

interface CacheEntry {
  data: CandleData[]
  ts: number
}

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const cache = new Map<string, CacheEntry>()

// Cache TTL per timeframe (shorter timeframes refresh faster)
const CACHE_TTL: Record<Timeframe, number> = {
  '1m':  10_000,   // 10s
  '5m':  30_000,   // 30s
  '15m': 60_000,   // 1min
  '1h':  120_000,  // 2min
  '4h':  300_000,  // 5min
  '1d':  600_000,  // 10min
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // Parse & validate symbol
  const symbolRaw = searchParams.get('symbol') ?? ''
  const binanceSymbol = VP_TO_BINANCE[symbolRaw]
  if (!binanceSymbol) {
    return NextResponse.json(
      { error: `Unknown symbol: ${symbolRaw}. Supported: ${Object.keys(VP_TO_BINANCE).join(', ')}` },
      { status: 400 }
    )
  }

  // Parse & validate timeframe
  const tf = (searchParams.get('timeframe') ?? '1h') as Timeframe
  if (!VALID_TIMEFRAMES.includes(tf)) {
    return NextResponse.json(
      { error: `Invalid timeframe: ${tf}. Supported: ${VALID_TIMEFRAMES.join(', ')}` },
      { status: 400 }
    )
  }

  // Parse & validate limit
  const limitStr = searchParams.get('limit') ?? '500'
  const limit = Math.max(1, Math.min(1500, parseInt(limitStr, 10) || 500))

  // ── Check cache ────────────────────────────────────────────────────────────
  const cacheKey = `${binanceSymbol}:${tf}:${limit}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL[tf]) {
    return NextResponse.json({
      candles: cached.data,
      symbol: symbolRaw,
      timeframe: tf,
      cached: true,
    })
  }

  // ── Fetch from Binance REST API ────────────────────────────────────────────
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${tf}&limit=${limit}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VerticalProp/1.0' },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[Candles] Binance error ${res.status}:`, text)
      return NextResponse.json(
        { error: `Binance API error: ${res.status}` },
        { status: 502 }
      )
    }

    // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
    const raw: Array<Array<string | number>> = await res.json()

    const candles: CandleData[] = raw.map(k => ({
      time: Math.floor(Number(k[0]) / 1000), // openTime ms → seconds (UTC)
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }))

    // Store in cache
    cache.set(cacheKey, { data: candles, ts: Date.now() })

    // Limit cache size (max 100 entries)
    if (cache.size > 100) {
      const oldest = cache.keys().next().value
      if (oldest) cache.delete(oldest)
    }

    return NextResponse.json({
      candles,
      symbol: symbolRaw,
      timeframe: tf,
      cached: false,
    })
  } catch (err) {
    console.error('[Candles] Fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch candle data from Binance' },
      { status: 502 }
    )
  }
}
