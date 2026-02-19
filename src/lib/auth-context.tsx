'use client'

/**
 * AuthContext — session management for VerticalProp.
 *
 * Wraps the /api/proxy/auth/* endpoints.
 * In dev/mock mode the proxy returns a fake session so the UI always works.
 * In production it forwards to the real better-auth API.
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
  loading: boolean        // initial session fetch
  submitting: boolean     // sign-in / sign-up in flight
  error: string | null
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
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

    fetch('/api/proxy/auth/get-session', { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<SessionResponse> : null)
      .then(data => {
        if (cancelled) return
        setState(s => ({ ...s, user: data?.user ?? null, loading: false }))
      })
      .catch(() => {
        if (!cancelled) setState(s => ({ ...s, loading: false }))
      })

    return () => { cancelled = true }
  }, [])

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, submitting: true, error: null }))
    try {
      const res = await fetch('/api/proxy/auth/sign-in/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message ?? data?.error ?? 'Invalid email or password.')
      }
      setState(s => ({ ...s, user: data.user, submitting: false }))
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
      const res = await fetch('/api/proxy/auth/sign-up/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message ?? data?.error ?? 'Registration failed.')
      }
      setState(s => ({ ...s, submitting: false }))
      // After sign-up → redirect to login with success message
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
      await fetch('/api/proxy/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })
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
