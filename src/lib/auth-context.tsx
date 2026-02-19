'use client'

/**
 * AuthContext — session management for VerticalProp.
 *
 * When Supabase is configured (.env.local has real keys):
 *   → uses @supabase/supabase-js directly for auth calls
 *   → fetches profile from /api/proxy/auth/get-session (queries profiles table)
 *
 * When Supabase is NOT configured (placeholder keys in .env.local):
 *   → falls back to the original mock proxy endpoints (/api/proxy/auth/*)
 *   → app continues to work identically in full-mock mode
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User, SessionResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  loading: boolean
  submitting: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.length > 0 &&
    !url.includes('VOTRE_REF') &&
    key.length > 0 &&
    !key.includes('VOTRE_ANON')
  )
}

// Lazy-import Supabase browser client only when configured
async function getSupabase() {
  const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
  return createSupabaseBrowserClient()
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    submitting: false,
    error: null,
  })

  // ── Fetch current session on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchSession() {
      try {
        if (isSupabaseConfigured()) {
          // Supabase mode: check session then fetch profile
          const supabase = await getSupabase()
          const { data: { session } } = await supabase.auth.getSession()

          if (!session) {
            if (!cancelled) setState(s => ({ ...s, user: null, loading: false }))
            return
          }

          // Fetch enriched user from proxy (which joins profiles table)
          const res = await fetch('/api/proxy/auth/get-session', { credentials: 'include' })
          const data: SessionResponse | null = res.ok ? await res.json() : null
          if (!cancelled) setState(s => ({ ...s, user: data?.user ?? null, loading: false }))
        } else {
          // Mock mode: legacy proxy call
          const res = await fetch('/api/proxy/auth/get-session', { credentials: 'include' })
          const data: SessionResponse | null = res.ok ? await res.json() : null
          if (!cancelled) setState(s => ({ ...s, user: data?.user ?? null, loading: false }))
        }
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }))
      }
    }

    fetchSession()
    return () => { cancelled = true }
  }, [])

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, submitting: true, error: null }))
    try {
      if (isSupabaseConfigured()) {
        // Supabase Auth
        const supabase = await getSupabase()
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
        if (!data.session) throw new Error('No session returned')

        // Fetch enriched profile
        const res = await fetch('/api/proxy/auth/get-session', { credentials: 'include' })
        const sessionData: SessionResponse | null = res.ok ? await res.json() : null
        setState(s => ({ ...s, user: sessionData?.user ?? null, submitting: false }))
      } else {
        // Mock mode
        const res = await fetch('/api/proxy/auth/sign-in/email', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'Invalid email or password.')
        setState(s => ({ ...s, user: data.user, submitting: false }))
      }
      router.push('/dashboard/overview')
    } catch (err) {
      setState(s => ({
        ...s,
        submitting: false,
        error: err instanceof Error ? err.message : 'Sign in failed.',
      }))
    }
  }, [router])

  // ── Sign up ───────────────────────────────────────────────────────────────
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setState(s => ({ ...s, submitting: true, error: null }))
    try {
      if (isSupabaseConfigured()) {
        // Supabase Auth — sends confirmation email
        const supabase = await getSupabase()
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw new Error(error.message)
        setState(s => ({ ...s, submitting: false }))
      } else {
        // Mock mode
        const res = await fetch('/api/proxy/auth/sign-up/email', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'Registration failed.')
        setState(s => ({ ...s, submitting: false }))
      }
      router.push('/login?registered=1')
    } catch (err) {
      setState(s => ({
        ...s,
        submitting: false,
        error: err instanceof Error ? err.message : 'Registration failed.',
      }))
    }
  }, [router])

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setState(s => ({ ...s, submitting: true }))
    try {
      if (isSupabaseConfigured()) {
        const supabase = await getSupabase()
        await supabase.auth.signOut()
      } else {
        await fetch('/api/proxy/auth/sign-out', {
          method: 'POST',
          credentials: 'include',
        })
      }
    } finally {
      setState({ user: null, loading: false, submitting: false, error: null })
      router.push('/login')
    }
  }, [router])

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
