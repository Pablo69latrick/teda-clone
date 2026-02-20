'use client'

import { Suspense, useEffect, useState } from 'react'
import { Eye, EyeOff, TrendingUp, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

// Inner component — useSearchParams requires Suspense boundary
function LoginForm() {
  const { signIn, signInWithGoogle, submitting, error, clearError } = useAuth()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const justVerified = searchParams.get('verified') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Clear auth errors when user edits form
  useEffect(() => { clearError() }, [email, password, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn(email, password)
  }

  return (
    <div className="dark min-h-screen bg-background flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-card border-r border-border/50 p-12">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/teda-logo.jpg" alt="TEDA" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-lg tracking-tight">TEDA</span>
        </div>
        <div>
          <blockquote className="text-2xl font-semibold leading-relaxed text-foreground mb-4">
            &ldquo;The fastest path from trader to funded professional.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">T</div>
            <div>
              <div className="text-sm font-medium">George Wilson</div>
              <div className="text-xs text-muted-foreground">$305K Funded • +41% this quarter</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <div><div className="text-xl font-bold text-foreground">1,000+</div>Traders funded</div>
          <div><div className="text-xl font-bold text-foreground">$8M+</div>Capital deployed</div>
          <div><div className="text-xl font-bold text-foreground">90%</div>Profit share</div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/teda-logo.jpg" alt="TEDA" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-bold">TEDA</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your trading account</p>

          {/* Success banner after registration */}
          {justRegistered && (
            <div className="flex items-start gap-2 bg-profit/10 border border-profit/30 rounded-lg px-3 py-2.5 mb-5 text-xs text-profit">
              <CheckCircle className="size-3.5 mt-0.5 shrink-0" />
              Account created! Check your email to verify, then sign in.
            </div>
          )}

          {/* Success banner after email verification */}
          {justVerified && (
            <div className="flex items-start gap-2 bg-profit/10 border border-profit/30 rounded-lg px-3 py-2.5 mb-5 text-xs text-profit">
              <CheckCircle className="size-3.5 mt-0.5 shrink-0" />
              Email verified! Sign in to get started.
            </div>
          )}

          {/* Error banner */}
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Link href="/forgot-password" className="text-[10px] text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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

            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full h-10 mt-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="size-4" /></>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-3">or continue with</span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-10 text-sm gap-2" type="button" onClick={() => signInWithGoogle()} disabled={submitting}>
            <svg className="size-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Start your challenge
            </Link>
          </p>

          {/* Dev shortcut hint */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
              Dev mode — any email + 6+ char password works
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
