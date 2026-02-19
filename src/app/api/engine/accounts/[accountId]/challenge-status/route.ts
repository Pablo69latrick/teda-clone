import { NextResponse } from 'next/server'

// GET /api/engine/accounts/:accountId/challenge-status
// Returns the current challenge phase progress (phase 1, phase 2, funded)
// NOTE: Returns 500 on VerticalProp for funded accounts (no active challenge)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params

  // TODO: Check if account is in a challenge phase or already funded
  void accountId

  // Funded accounts have no active challenge → return null
  return NextResponse.json({
    account_id: accountId,
    phase: null, // null = funded, 'phase1' | 'phase2' = in challenge
    challenge: null,
    status: 'funded',
  })
}
