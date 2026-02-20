'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isBrowserSupabaseConfigured } from '@/lib/supabase/config'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  // On mount, Supabase client detects the hash fragment and exchanges for a session
  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      setSessionReady(true)
      return
    }

    let cancelled = false
    async function init() {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabase = createSupabaseBrowserClient()

        // Listen for the PASSWORD_RECOVERY event from hash fragments
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY' && !cancelled) {
            setSessionReady(true)
          }
        })

        // Also check if session already exists (user may have a valid session)
        const { data: { session } } = await supabase.auth.getSession()
        if (session && !cancelled) {
          setSessionReady(true)
        }

        // Timeout after 5s
        setTimeout(() => {
          if (!cancelled) setSessionReady(r => { if (!r) setSessionError(true); return r })
        }, 5000)

        return () => {
          cancelled = true
          subscription.unsubscribe()
        }
      } catch {
        if (!cancelled) setSessionError(true)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (isBrowserSupabaseConfigured()) {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabase = createSupabaseBrowserClient()
        const { error: sbError } = await supabase.auth.updateUser({ password })
        if (sbError) throw new Error(sbError.message)
      } else {
        // Mock mode
        await new Promise(r => setTimeout(r, 800))
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/teda-logo.jpg" alt="TEDA" className="w-6 h-6 rounded-md object-contain" />
          <span className="font-bold">TEDA</span>
        </div>

        {success ? (
          /* Success */
          <div className="text-center">
            <div className="mx-auto size-12 rounded-full bg-profit/10 flex items-center justify-center mb-4">
              <CheckCircle className="size-5 text-profit" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password updated</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button className="h-10 gap-2">
                Sign In <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        ) : sessionError ? (
          /* Invalid or expired link */
          <div className="text-center">
            <div className="mx-auto size-12 rounded-full bg-loss/10 flex items-center justify-center mb-4">
              <AlertCircle className="size-5 text-loss" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Link expired</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link href="/forgot-password">
              <Button variant="outline" className="h-10 gap-2">
                Request New Link <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        ) : !sessionReady ? (
          /* Loading state while session establishes */
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Verifying reset link...</p>
          </div>
        ) : (
          /* Form */
          <>
            <h1 className="text-2xl font-bold mb-1">Set new password</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Choose a strong password for your account.
            </p>

            {error && (
              <div className="flex items-start gap-2 bg-loss/10 border border-loss/30 rounded-lg px-3 py-2.5 mb-5 text-xs text-loss">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 focus:bg-muted/50 text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 focus:bg-muted/50 text-foreground placeholder:text-muted-foreground transition-colors"
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-[10px] text-loss mt-1">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || password.length < 8 || !confirmPassword}
                className="w-full h-10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Update Password <ArrowRight className="size-4" /></>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
