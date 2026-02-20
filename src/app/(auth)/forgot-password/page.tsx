'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isBrowserSupabaseConfigured } from '@/lib/supabase/config'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (isBrowserSupabaseConfigured()) {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
        const supabase = createSupabaseBrowserClient()
        const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (sbError) throw new Error(sbError.message)
      } else {
        // Mock mode — just pretend it worked
        await new Promise(r => setTimeout(r, 800))
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.')
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

        {sent ? (
          /* Success state */
          <div className="text-center">
            <div className="mx-auto size-12 rounded-full bg-profit/10 flex items-center justify-center mb-4">
              <Mail className="size-5 text-profit" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a password reset link to <strong className="text-foreground">{email}</strong>.
              Click the link in the email to reset your password.
            </p>
            <Link href="/login">
              <Button variant="outline" className="h-10 gap-2">
                <ArrowLeft className="size-4" /> Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="flex items-start gap-2 bg-loss/10 border border-loss/30 rounded-lg px-3 py-2.5 mb-5 text-xs text-loss">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 focus:bg-muted/50 text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !email}
                className="w-full h-10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send Reset Link <ArrowRight className="size-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="size-3" /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
