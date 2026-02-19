import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/bookmarks
// Returns the user's bookmarked/favourite instruments
export async function GET() {
  // TODO: Fetch from DB per user
  return NextResponse.json({
    results: [
      { symbol: 'BTC-USD' },
      { symbol: 'EUR-USD' },
      { symbol: 'XAU-USD' },
    ],
  })
}

// POST /api/engine/bookmarks — add bookmark
export async function POST(request: NextRequest) {
  const body = await request.json()
  // TODO: Save bookmark to DB
  void body
  return NextResponse.json({ success: true })
}

// DELETE /api/engine/bookmarks — remove bookmark
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  // TODO: Remove bookmark from DB
  void body
  return NextResponse.json({ success: true })
}
