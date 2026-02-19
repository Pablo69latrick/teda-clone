import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/payouts?account_id=xxx
// Returns all payout requests for the user or a specific account
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

  // TODO: Fetch real payouts from DB filtered by accountId
  void accountId

  return NextResponse.json({
    results: [],
    count: 0,
  })
}

// POST /api/engine/payouts — request a new payout
export async function POST(request: NextRequest) {
  const body = await request.json()
  // body: { account_id, amount, wallet_address, method: 'crypto'|'bank'|'wise' }
  // TODO: Validate eligibility, create payout request in DB
  void body
  return NextResponse.json({
    id: 'payout_' + Date.now(),
    status: 'pending',
    created_at: new Date().toISOString(),
  })
}
