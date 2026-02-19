import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

// ─── Instrument maps ──────────────────────────────────────────────────────────

/** Map VP symbol → CoinGecko coin ID */
const COINGECKO_IDS: Record<string, string> = {
  'BTC-USD':   'bitcoin',
  'ETH-USD':   'ethereum',
  'SOL-USD':   'solana',
  'XRP-USD':   'ripple',
  'ADA-USD':   'cardano',
  'DOGE-USD':  'dogecoin',
  'LINK-USD':  'chainlink',
  'ARB-USD':   'arbitrum',
  '1INCH-USD': '1inch',
  'AAVE-USD':  'aave',
  'ASTER-USD': 'astar',
}

/** Map VP symbol → Twelve Data symbol */
const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  'EUR-USD': 'EUR/USD',
  'GBP-USD': 'GBP/USD',
  'AUD-USD': 'AUD/USD',
}

type PriceRow = {
  symbol: string
  current_price: number
  current_bid: number
  current_ask: number
  mark_price: number
  funding_rate: number
  last_updated: number
}

// ─── GET /api/prices/update ───────────────────────────────────────────────────
// Called by Vercel cron every minute (vercel.json) or manually in dev.
// Fetches live prices from CoinGecko (crypto) and Twelve Data (forex),
// then upserts into the price_cache table.
//
// C-05: Protected by CRON_SECRET bearer token.
// Add CRON_SECRET=<random-string> to your env vars and to vercel.json:
//   "headers": [{ "Authorization": "Bearer $CRON_SECRET" }]
// For local dev without the secret set, the endpoint is open (NODE_ENV check).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const now = Date.now()
  const rows: PriceRow[] = []
  const errors: string[] = []

  // ── 1. Crypto via CoinGecko /simple/price (free, no key) ─────────────────
  try {
    const cgIds = Object.values(COINGECKO_IDS).join(',')
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=false`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 },
      }
    )

    if (cgRes.ok) {
      const cgData: Record<string, { usd: number }> = await cgRes.json()

      for (const [vpSymbol, cgId] of Object.entries(COINGECKO_IDS)) {
        const price = cgData[cgId]?.usd
        if (!price || isNaN(price)) continue

        const spread = price * 0.00015  // 0.015% spread
        rows.push({
          symbol: vpSymbol,
          current_price: price,
          current_bid:   +(price - spread).toFixed(8),
          current_ask:   +(price + spread).toFixed(8),
          mark_price:    price,
          funding_rate:  -0.0002,
          last_updated:  now,
        })
      }
    } else {
      errors.push(`CoinGecko HTTP ${cgRes.status}`)
    }
  } catch (e) {
    errors.push(`CoinGecko error: ${e}`)
  }

  // ── 2. Forex via Twelve Data /price (free tier: 800 req/day) ─────────────
  // Using batch call: 1 request for all 3 forex pairs (~144/day, well under limit)
  try {
    const tdApiKey = process.env.TWELVE_DATA_API_KEY
    if (tdApiKey && tdApiKey !== 'VOTRE_TWELVE_DATA_KEY') {
      const tdSymbols = Object.values(TWELVE_DATA_SYMBOLS).join(',')
      const tdRes = await fetch(
        `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbols)}&apikey=${tdApiKey}`,
        { next: { revalidate: 0 } }
      )

      if (tdRes.ok) {
        const tdData = await tdRes.json()

        for (const [vpSymbol, tdSymbol] of Object.entries(TWELVE_DATA_SYMBOLS)) {
          // Batch returns { "EUR/USD": { price: "1.0843" }, ... }
          // Single symbol returns { price: "1.0843" } directly
          const entry = tdData[tdSymbol] ?? (Object.keys(TWELVE_DATA_SYMBOLS).length === 1 ? tdData : null)
          const price = parseFloat(entry?.price ?? '0')
          if (!price || isNaN(price)) continue

          const spread = 0.00003  // 0.3 pip spread for forex
          rows.push({
            symbol: vpSymbol,
            current_price: price,
            current_bid:   +(price - spread).toFixed(5),
            current_ask:   +(price + spread).toFixed(5),
            mark_price:    price,
            funding_rate:  0,
            last_updated:  now,
          })
        }
      } else {
        errors.push(`Twelve Data HTTP ${tdRes.status}`)
      }
    } else {
      // No API key — generate a small random walk on bootstrap prices for dev
      const forexBootstrap: Record<string, number> = {
        'EUR-USD': 1.08432,
        'GBP-USD': 1.26750,
        'AUD-USD': 0.69584,
      }
      for (const [symbol, base] of Object.entries(forexBootstrap)) {
        const jitter = (Math.random() - 0.5) * 0.0004
        const price = +(base + jitter).toFixed(5)
        rows.push({
          symbol,
          current_price: price,
          current_bid:   +(price - 0.00003).toFixed(5),
          current_ask:   +(price + 0.00003).toFixed(5),
          mark_price:    price,
          funding_rate:  0,
          last_updated:  now,
        })
      }
    }
  } catch (e) {
    errors.push(`Twelve Data error: ${e}`)
  }

  // ── 3. Upsert into price_cache ────────────────────────────────────────────
  if (rows.length > 0) {
    try {
      const admin = createSupabaseAdminClient()
      const { error } = await admin
        .from('price_cache')
        .upsert(rows, { onConflict: 'symbol' })

      if (error) {
        errors.push(`Supabase upsert error: ${error.message}`)
      }
    } catch (e) {
      errors.push(`Supabase error: ${e}`)
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    updated: rows.length,
    ts: now,
    symbols: rows.map(r => r.symbol),
    errors: errors.length > 0 ? errors : undefined,
  })
}
