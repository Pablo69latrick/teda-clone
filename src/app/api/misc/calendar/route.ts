import { NextResponse } from 'next/server'

// GET /api/misc/calendar
// Returns the economic calendar events (high/medium/low impact)
// This is fetched from an external provider (e.g. Forex Factory, Investing.com API)
// NOTE: Returns 503 occasionally on VerticalProp when external provider is down
export async function GET() {
  // TODO: Fetch from external economic calendar API and cache result
  // Example providers: ForexFactory, Investing.com, Myfxbook, TradingEconomics

  try {
    // Placeholder: return mock upcoming economic events
    const now = new Date()
    return NextResponse.json({
      events: [
        {
          id: 'ev_001',
          date: now.toISOString(),
          time: '13:30',
          currency: 'USD',
          impact: 'high', // 'high' | 'medium' | 'low'
          event: 'Non-Farm Payrolls',
          actual: null,
          forecast: '200K',
          previous: '216K',
          country: 'US',
        },
        {
          id: 'ev_002',
          date: now.toISOString(),
          time: '15:00',
          currency: 'USD',
          impact: 'medium',
          event: 'ISM Manufacturing PMI',
          actual: null,
          forecast: '47.8',
          previous: '47.2',
          country: 'US',
        },
      ],
      source: 'teda_calendar',
      updated_at: now.toISOString(),
    })
  } catch {
    return NextResponse.json(
      { error: 'Calendar service unavailable' },
      { status: 503 }
    )
  }
}
