import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/instruments?limit=50&offset=0&tradable_only=true
// Returns all available trading instruments (forex pairs, crypto, indices, commodities)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const tradableOnly = searchParams.get('tradable_only') === 'true'

  void tradableOnly

  // TODO: Fetch real instruments from trading engine / broker API
  const instruments = [
    { symbol: 'BTC-USD', name: 'Bitcoin / US Dollar', category: 'crypto', tradable: true, pip: 0.01 },
    { symbol: 'ETH-USD', name: 'Ethereum / US Dollar', category: 'crypto', tradable: true, pip: 0.01 },
    { symbol: 'EUR-USD', name: 'Euro / US Dollar', category: 'forex', tradable: true, pip: 0.0001 },
    { symbol: 'GBP-USD', name: 'British Pound / US Dollar', category: 'forex', tradable: true, pip: 0.0001 },
    { symbol: 'USD-JPY', name: 'US Dollar / Japanese Yen', category: 'forex', tradable: true, pip: 0.01 },
    { symbol: 'XAU-USD', name: 'Gold / US Dollar', category: 'commodities', tradable: true, pip: 0.01 },
    { symbol: 'US30', name: 'Dow Jones Industrial Average', category: 'indices', tradable: true, pip: 1 },
    { symbol: 'NAS100', name: 'NASDAQ 100', category: 'indices', tradable: true, pip: 0.1 },
    { symbol: 'SPX500', name: 'S&P 500', category: 'indices', tradable: true, pip: 0.1 },
  ]

  return NextResponse.json({
    results: instruments.slice(0, limit),
    count: instruments.length,
  })
}
