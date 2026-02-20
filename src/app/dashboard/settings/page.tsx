'use client'

import { useState } from 'react'
import {
  User, Mail, Lock, Bell, Shield, Smartphone,
  CheckCircle, AlertCircle, Eye, EyeOff, Camera,
  Globe, Moon, Palette, LogOut, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Badge } from '@/components/ui/badge'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'danger'

// ─── Toast helper ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const show = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-border/40">
        <h3 className="text-sm font-semibold">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Input row ───────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', placeholder, disabled, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; hint?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200',
          checked && 'translate-x-5'
        )} />
      </button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { toast, show: showToast } = useToast()

  const [tab, setTab] = useState<SettingsTab>('profile')

  // Profile fields
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled ?? false)

  // Notifications
  const [notifPositionOpen,  setNotifPositionOpen]  = useState(true)
  const [notifPositionClose, setNotifPositionClose] = useState(true)
  const [notifChallengeAlert, setNotifChallengeAlert] = useState(true)
  const [notifPayouts,        setNotifPayouts]        = useState(true)
  const [notifMarketing,      setNotifMarketing]      = useState(false)
  const [emailDigest,         setEmailDigest]         = useState(true)

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [currency, setCurrency] = useState('USD')
  const [numberFormat, setNumberFormat] = useState('en-US')

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/proxy/settings/update-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast('error', err.error ?? 'Failed to update profile')
      } else {
        showToast('success', 'Profile updated successfully')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async () => {
    if (newPw !== confirmPw) { showToast('error', 'Passwords do not match'); return }
    if (newPw.length < 8)    { showToast('error', 'Password must be at least 8 characters'); return }
    setSavingPw(true)
    try {
      const res = await fetch('/api/proxy/settings/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPw }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast('error', err.error ?? 'Failed to change password')
      } else {
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
        showToast('success', 'Password changed successfully')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setSavingPw(false)
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'security',      label: 'Security',      icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance',    label: 'Appearance',    icon: Palette },
    { id: 'danger',        label: 'Danger Zone',   icon: Trash2 },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and security</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg',
          toast.type === 'success'
            ? 'bg-profit/10 border-profit/30 text-profit'
            : 'bg-loss/10 border-loss/30 text-loss'
        )}>
          {toast.type === 'success'
            ? <CheckCircle className="size-4" />
            : <AlertCircle className="size-4" />}
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                tab === t.id
                  ? 'bg-card border border-border text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                t.id === 'danger' && tab === 'danger' && 'text-loss border-loss/30'
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div className="flex flex-col gap-5">
          <Section title="Avatar" desc="Your profile picture is shown across the platform">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-foreground">
                  {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
                </div>
                <button className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Camera className="size-3 text-primary-foreground" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name ?? 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={user?.emailVerified ? 'active' : 'secondary'} className="text-[10px]">
                    {user?.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {user?.role ?? 'user'}
                  </Badge>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Personal Information" desc="Update your name and email address">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" value={name} onChange={setName} placeholder="Your name" />
              <Field label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={saveProfile} disabled={savingProfile} className="gap-2 h-9">
                {savingProfile
                  ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle className="size-3.5" />
                }
                Save Changes
              </Button>
            </div>
          </Section>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === 'security' && (
        <div className="flex flex-col gap-5">
          <Section title="Change Password" desc="Use a strong, unique password">
            <div className="flex flex-col gap-4">
              <Field label="Current Password" value={currentPw} onChange={setCurrentPw} type="password" placeholder="••••••••" />
              <Field label="New Password" value={newPw} onChange={setNewPw} type="password" placeholder="Min. 8 characters"
                hint="Use letters, numbers, and symbols for a stronger password" />
              <Field label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Re-enter new password" />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={changePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw} className="gap-2 h-9">
                {savingPw
                  ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Lock className="size-3.5" />
                }
                Update Password
              </Button>
            </div>
          </Section>

          <Section title="Two-Factor Authentication" desc="Add an extra layer of security to your account">
            <Toggle
              label="Enable 2FA"
              desc="Require a code from your authenticator app when signing in"
              checked={twoFactor}
              onChange={setTwoFactor}
            />
            {twoFactor && (
              <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-start gap-2">
                <Smartphone className="size-4 shrink-0 mt-0.5" />
                <span>Scan the QR code in your authenticator app (Google Authenticator, Authy, etc.) to complete setup. <span className="text-primary cursor-pointer hover:underline">Set up now →</span></span>
              </div>
            )}
          </Section>

          <Section title="Active Sessions">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Current session</p>
                  <p className="text-[10px] text-muted-foreground">Web browser · {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <Badge variant="active" className="text-[10px]">Active</Badge>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs text-loss hover:text-loss/80 transition-colors font-medium"
              >
                <LogOut className="size-3.5" />Sign out of all sessions
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifications' && (
        <div className="flex flex-col gap-5">
          <Section title="In-App Notifications" desc="Control what you see in the platform">
            <Toggle label="Position Opened" desc="Notify when a new position is opened" checked={notifPositionOpen} onChange={setNotifPositionOpen} />
            <Toggle label="Position Closed" desc="Notify when a position is closed (profit or loss)" checked={notifPositionClose} onChange={setNotifPositionClose} />
            <Toggle label="Challenge Alerts" desc="Warn when near daily loss or drawdown limits" checked={notifChallengeAlert} onChange={setNotifChallengeAlert} />
            <Toggle label="Payout Updates" desc="Notify on payout status changes" checked={notifPayouts} onChange={setNotifPayouts} />
          </Section>

          <Section title="Email Notifications" desc="Choose what gets sent to your inbox">
            <Toggle label="Daily Digest" desc="Summary of your trading activity each day" checked={emailDigest} onChange={setEmailDigest} />
            <Toggle label="Marketing & News" desc="Product updates and trading tips from VerticalProp" checked={notifMarketing} onChange={setNotifMarketing} />
          </Section>
        </div>
      )}

      {/* ── APPEARANCE ── */}
      {tab === 'appearance' && (
        <div className="flex flex-col gap-5">
          <Section title="Theme" desc="Choose how VerticalProp looks">
            <div className="grid grid-cols-3 gap-3">
              {(['dark', 'light', 'system'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all capitalize',
                    theme === t
                      ? 'border-primary/60 bg-primary/5 text-foreground'
                      : 'border-border/50 bg-card/50 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Moon className="size-5" />
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Display Preferences">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Display Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 text-foreground transition-colors"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Number Format</label>
                <select
                  value={numberFormat}
                  onChange={e => setNumberFormat(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/60 text-foreground transition-colors"
                >
                  <option value="en-US">1,234.56 (US)</option>
                  <option value="fr-FR">1 234,56 (EU)</option>
                  <option value="de-DE">1.234,56 (DE)</option>
                </select>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── DANGER ZONE ── */}
      {tab === 'danger' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl bg-card border border-loss/30 overflow-hidden">
            <div className="px-6 py-5 border-b border-loss/20 bg-loss/5">
              <h3 className="text-sm font-semibold text-loss">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mt-0.5">These actions are irreversible. Proceed with caution.</p>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4 py-3 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium">Close All Positions</p>
                  <p className="text-xs text-muted-foreground">Immediately close all open positions at market price</p>
                </div>
                <button className="shrink-0 px-3 py-1.5 rounded-lg border border-loss/30 text-loss text-xs font-medium hover:bg-loss/10 transition-colors">
                  Close All
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
                </div>
                <button className="shrink-0 px-3 py-1.5 rounded-lg border border-loss/30 text-loss text-xs font-medium hover:bg-loss/10 transition-colors">
                  Delete
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your current session</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground text-xs font-medium hover:bg-muted/40 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="size-3" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
