import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/orders?account_id=xxx&statuses=pending,partial
// Returns open/pending orders for an account
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const statuses = searchParams.get('statuses')?.split(',') || ['pending']

  // TODO: Fetch real orders from trading engine
  void accountId
  void statuses

  return NextResponse.json({
    results: [],
    count: 0,
  })
}

// POST /api/engine/orders — place a new order
export async function POST(request: NextRequest) {
  const body = await request.json()
  // body: { account_id, symbol, side: 'buy'|'sell', type: 'market'|'limit'|'stop', size, price?, stop_loss?, take_profit? }
  // TODO: Send order to trading engine / broker
  void body
  return NextResponse.json({
    id: 'order_' + Date.now(),
    status: 'pending',
    created_at: new Date().toISOString(),
  })
}

// DELETE /api/engine/orders — cancel an order
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  // body: { order_id, account_id }
  void body
  return NextResponse.json({ success: true })
}
