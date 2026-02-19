import { NextResponse } from 'next/server'

// GET /api/auth/get-session
// Returns the current authenticated user session
export async function GET() {
  // TODO: Replace with real session logic (JWT / NextAuth / custom)
  return NextResponse.json({
    user: {
      id: 'f2538dee-cfb0-422a-bf7b-c6b247145b3a',
      email: 'mercure@gmail.com',
      name: 'Jules Capital',
      initials: 'JJ',
      role: 'trader',
    },
    authenticated: true,
  })
}
