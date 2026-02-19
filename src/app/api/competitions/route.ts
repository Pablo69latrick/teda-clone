import { NextResponse } from 'next/server'

// GET /api/competitions
// Returns active and upcoming trading competitions
export async function GET() {
  // TODO: Fetch real competitions from DB
  return NextResponse.json({
    results: [],
    active: [],
    upcoming: [],
    past: [],
  })
}
