import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/notifications?limit=20&offset=0&account_id=xxx
// Returns notifications for the user or a specific account
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const accountId = searchParams.get('account_id')

  // TODO: Fetch real notifications from DB filtered by accountId
  void accountId
  void offset

  return NextResponse.json({
    results: [],
    count: 0,
    limit,
    offset: 0,
    unread_count: 0,
  })
}

// POST /api/engine/notifications — mark as read
export async function POST(request: NextRequest) {
  const body = await request.json()
  // TODO: Mark notification IDs as read in DB
  void body
  return NextResponse.json({ success: true })
}
