import { NextResponse } from 'next/server'

// GET /api/centrifugo/token
// Returns a Centrifugo WebSocket token for real-time data (positions, P&L, etc.)
// Centrifugo is the real-time pub/sub engine used by VerticalProp
export async function GET() {
  // TODO: Generate a real Centrifugo JWT token using the Centrifugo secret
  // See: https://centrifugal.dev/docs/server/authentication
  return NextResponse.json({
    token: 'centrifugo_jwt_token_placeholder',
    expires_in: 3600,
  })
}
