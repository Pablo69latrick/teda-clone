'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, TrendingUp, ArrowRight, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

const STEPS = ['Account', 'Challenge', 'Confirm']

const plans = [
  { id: 'starter',  label: '$95K Junior',  price: 299,  target: '8%',  maxDD: '10%', split: '80%', phases: 2 },
  { id: 'standard', label: '$205K Senior',   price: 549,  target: '10%', maxDD: '10%', split: '80%', phases: 1 },
  { id: 'elite',    label: '$305K Associate',     price: 1099, target: '8%',  maxDD: '8%',  split: '90%', phases: 2 },
]

export default function RegisterPage() {
  const { signUp, signInWithGoogle, submitting, error, clearError } = useAuth()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('standard')

  useEffect(() => { clearError() }, [name, email, password, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 2) {
      setStep(s => s + 1)
      return
    }
    // Final step — call sign-up
    await signUp(name, email, password)
  }

  return (
    <div className="dark min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-card border-r border-border/50 p-12">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/teda-logo.jpg" alt="TEDA" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-lg tracking-tight">TEDA</span>
        </div>
        <div className="flex flex-col gap-4">
          {[
            { icon: '⚡', title: 'Instant Funding', desc: 'No evaluation, no challenge — start trading immediately' },
            { icon: '💰', title: 'Up to 95% Profit Share', desc: 'Keep the majority of what you earn, always' },
            { icon: '📈', title: 'Up to $305K Instantly', desc: 'No challenge, no evaluation — get funded today' },
            { icon: '🛡️', title: 'No Hidden Rules', desc: 'Transparent, simple rules — no surprises' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Join 1,800+ funded traders on TEDA. Start your challenge today.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/teda-logo.jpg" alt="TEDA" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-bold">TEDA</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                  i < step  ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary/20 text-primary border border-primary/50' :
                               'bg-muted text-muted-foreground'
                )}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </div>
                <span className={cn('text-xs font-medium', i === step ? 'text-foreground' : 'text-muted-foreground')}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-px w-6 bg-border/50 mx-1', i < step && 'bg-primary/40')} />
                )}
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-bold mb-1">
            {step === 0 ? 'Create your account' : step === 1 ? 'Choose your challenge' : 'Review & confirm'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {step === 0 ? 'Enter your details to get started'
              : step === 1 ? 'Pick a plan that fits your trading style'
              : 'Verify your selection before purchase'}
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-loss/10 border border-loss/30 rounded-lg px-3 py-2.5 mb-5 text-xs text-loss">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* ── Step 0: account details ── */}
            {step === 0 && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    required
                    autoComplete="name"
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    required
                    autoComplete="email"
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 pr-10 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-[10px] text-loss mt-1">At least 8 characters required</p>
                  )}
                </div>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="bg-background px-3">or</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-10 text-sm gap-2" type="button" onClick={() => signInWithGoogle()} disabled={submitting}>
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign up with Google
                </Button>
              </>
            )}

            {/* ── Step 1: challenge selection ── */}
            {step === 1 && (
              <div className="flex flex-col gap-3">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      'flex items-start justify-between rounded-xl border p-4 text-left transition-all',
                      selectedPlan === plan.id
                        ? 'border-primary/60 bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-border/50 bg-card hover:border-border hover:bg-muted/20'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold">{plan.label}</span>
                        {plan.id === 'standard' && (
                          <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">Popular</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>Target: <strong className="text-profit">{plan.target}</strong></span>
                        <span>Max DD: <strong className="text-loss">{plan.maxDD}</strong></span>
                        <span>Split: <strong className="text-foreground">{plan.split}</strong></span>
                        <span>Phases: <strong className="text-foreground">{plan.phases}</strong></span>
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-lg font-bold">${plan.price}</div>
                      <div className="text-[10px] text-muted-foreground">one-time</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Step 2: confirm ── */}
            {step === 2 && (() => {
              const plan = plans.find(p => p.id === selectedPlan)!
              return (
                <div className="rounded-xl bg-card border border-border/50 p-4 flex flex-col gap-3 text-sm">
                  {[
                    { label: 'Name',      value: name },
                    { label: 'Email',     value: email },
                    { label: 'Challenge', value: plan.label },
                    { label: 'Price',     value: `$${plan.price}` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-2 mt-1 text-[10px] text-muted-foreground">
                    By continuing you agree to our Terms of Service and Risk Disclosure.
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(s => s - 1)}
                  disabled={submitting}
                  className="h-10 px-4"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting || (step === 0 && (!name || !email || password.length < 8))}
                className="flex-1 h-10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : step < 2 ? (
                  <>Continue <ArrowRight className="size-4" /></>
                ) : (
                  <>Complete Registration <ArrowRight className="size-4" /></>
                )}
              </Button>
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
