/**
 * Supabase configuration helpers — single source of truth.
 *
 * Previously, identical detection logic was duplicated across 4 files
 * (route.ts, auth-context.tsx, realtime.ts, middleware.ts) with slightly
 * different placeholder-string checks. All consumers should import from here.
 *
 * Two variants:
 *  - isBrowserSupabaseConfigured()  — checks public env vars (NEXT_PUBLIC_*)
 *    Used by: client components, realtime hook, auth context, middleware
 *
 *  - isServerSupabaseConfigured()   — checks service role key (server-side only)
 *    Used by: API route handlers (never import in 'use client' files)
 */

/** Browser / SSR check — uses only public env vars */
export function isBrowserSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.length > 0 &&
    !url.includes('VOTRE_REF') &&
    key.length > 0 &&
    !key.includes('VOTRE_ANON')
  )
}

/** Server-only check — verifies the service role key is also present */
export function isServerSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return (
    url.length > 0 &&
    !url.includes('VOTRE_REF') &&
    key.length > 0 &&
    !key.includes('VOTRE_SERVICE')
  )
}
