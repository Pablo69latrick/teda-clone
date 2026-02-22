'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Wallet,
  Trophy,
  Users,
  BookOpen,
  Settings,
  TrendingUp,
  Zap,
  ShieldCheck,
  Medal,
  LogOut,
  Plus,
  Check,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useActiveAccount } from '@/lib/use-active-account'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'

// ─── Logo TEDA ────────────────────────────────────
function VerticalLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/landing/teda-logo.jpg"
      alt="TEDA"
      className={cn('w-9 h-9 shrink-0 rounded-xl object-contain transition-transform duration-300 hover:scale-105', className)}
    />
  )
}

// ─── Nav item types ────────────────────────────
interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const mainNavItems: NavItem[] = [
  { label: 'Overview',     href: '/dashboard/overview',     icon: LayoutDashboard },
  { label: 'Analytics',    href: '/dashboard/analytics',    icon: BarChart3 },
  { label: 'Competitions', href: '/dashboard/competitions', icon: Trophy },
  { label: 'Leaderboard',  href: '/dashboard/leaderboard',  icon: Medal },
  { label: 'Calendar',     href: '/dashboard/calendar',     icon: Calendar },
  { label: 'Payouts',      href: '/dashboard/payouts',      icon: Wallet },
  { label: 'Affiliate',    href: '/dashboard/affiliate',    icon: Users },
]

const bottomNavItems: NavItem[] = [
  { label: 'Academy',      href: '/help',                                          icon: BookOpen },
  { label: 'Admin Panel',  href: '/dashboard/admin/god-mode/treasurer',            icon: ShieldCheck, adminOnly: true },
]

// ─── Tooltip wrapper ───────────────────────────
function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 rounded-md text-xs font-medium bg-popover text-popover-foreground border border-border shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50">
        {label}
      </div>
    </div>
  )
}

// ─── Single nav item ───────────────────────────
function SidebarNavItem({
  item,
  isActive,
}: {
  item: NavItem
  isActive: boolean
}) {
  const Icon = item.icon
  return (
    <NavTooltip label={item.label}>
      <Link
        href={item.href}
        className={cn(
          'flex items-center h-9 rounded-lg transition-all duration-200 ease-out relative group overflow-hidden',
          'w-10 mx-auto justify-center',
          isActive
            ? 'bg-primary/10 text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.98]'
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        {/* Active indicator bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
        )}
      </Link>
    </NavTooltip>
  )
}

// ─── Status dot color map ──────────────────────
const STATUS_DOT: Record<string, string> = {
  active:  'bg-profit',
  funded:  'bg-blue-500',
  breached:'bg-loss',
  passed:  'bg-yellow-500',
  closed:  'bg-muted-foreground',
}

const STATUS_BADGE: Record<string, string> = {
  active:  'bg-profit/15 text-profit',
  funded:  'bg-blue-500/15 text-blue-500',
  breached:'bg-loss/15 text-loss',
  passed:  'bg-yellow-500/15 text-yellow-500',
  closed:  'bg-muted-foreground/15 text-muted-foreground',
}

// ─── Account Switcher ──────────────────────────
function AccountSwitcher() {
  const { activeAccount, accounts, setActiveAccountId } = useActiveAccount()
  const { user } = useAuth()

  const initials = user
    ? (user.name ?? user.email)
        .split(/[\s@.]+/)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase() ?? '')
        .join('')
    : '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center cursor-pointer outline-none group transition-all duration-300 h-10 w-10 mx-auto justify-center">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-foreground">
            {initials}
          </div>
          {/* Status indicator */}
          <span className={cn(
            'absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card',
            STATUS_DOT[activeAccount?.account_status ?? 'active'] ?? 'bg-profit'
          )} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          Switch Account ({accounts.length}/10)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={activeAccount?.id ?? ''}
          onValueChange={(id) => setActiveAccountId(id)}
        >
          {accounts.map((acct) => (
            <DropdownMenuRadioItem
              key={acct.id}
              value={acct.id}
              className="flex items-start gap-2 py-2 px-2 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate flex-1">
                    {acct.name}
                  </span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0',
                    STATUS_BADGE[acct.account_status] ?? STATUS_BADGE.active
                  )}>
                    {acct.account_status}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(acct.net_worth)}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <Link
          href="/dashboard/challenges"
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-accent"
        >
          <Plus className="size-4" />
          New Challenge
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main Sidebar Component ────────────────────
interface SidebarProps {
  userRole?: 'user' | 'admin'
}

export function Sidebar({ userRole: userRoleProp }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // Derive role from auth context (not hardcoded prop)
  const userRole = userRoleProp ?? (user?.role as 'user' | 'admin') ?? 'user'

  const isActive = (href: string) => {
    if (href === '/dashboard/overview') return pathname === href || pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed top-0 left-0 py-4 px-2 h-full flex flex-col z-20 bg-card/95 backdrop-blur-xl border-r border-border/50 max-sm:hidden shadow-sm w-16">
      {/* Logo */}
      <div className="flex items-center h-12 mb-4 overflow-hidden transition-all duration-300 ease-out justify-center gap-0">
        <Link href="/dashboard/overview">
          <VerticalLogo />
        </Link>
      </div>

      {/* Trade CTA */}
      <NavTooltip label="Trade">
        <Link
          href="/trade"
          className={cn(
            'relative group mb-4 overflow-hidden rounded-lg transition-all duration-300 ease-out',
            'mx-auto w-10 h-9 flex items-center justify-center',
            'bg-gradient-to-r from-primary to-primary/80',
            'hover:from-primary/90 hover:to-primary/70',
            'hover:shadow-md hover:shadow-primary/20',
            'active:scale-[0.98]',
            pathname.startsWith('/trade') && 'ring-1 ring-primary/40'
          )}
        >
          <TrendingUp className="size-[18px] text-primary-foreground" />
        </Link>
      </NavTooltip>

      {/* Main nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {mainNavItems.map(item => (
          <SidebarNavItem key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-1 my-2" />

      {/* Get Funded CTA → Challenges */}
      <NavTooltip label="Challenges">
        <Link
          href="/dashboard/challenges"
          className={cn(
            'relative group mb-2 overflow-hidden rounded-lg transition-all duration-300 ease-out',
            'mx-auto w-10 h-9 flex items-center justify-center',
            'bg-gradient-to-r from-primary to-primary/80',
            'hover:from-primary/90 hover:to-primary/70',
            'hover:shadow-md hover:shadow-primary/20',
            'active:scale-[0.98]',
            pathname.startsWith('/dashboard/challenges') && 'ring-1 ring-primary/40'
          )}
        >
          <Zap className="size-[18px] text-primary-foreground" />
        </Link>
      </NavTooltip>

      {/* Bottom nav */}
      <div className="flex flex-col gap-1">
        {bottomNavItems.map(item => {
          if (item.adminOnly && userRole !== 'admin') return null
          return (
            <SidebarNavItem key={item.href} item={item} isActive={isActive(item.href)} />
          )
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-1 my-2" />

      {/* Account Switcher */}
      <AccountSwitcher />

      {/* Settings */}
      <NavTooltip label="Settings">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center h-9 rounded-lg transition-all duration-200 ease-out w-10 mx-auto justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.98] mt-1',
            pathname === '/dashboard/settings' && 'bg-primary/10 text-primary'
          )}
        >
          <Settings className="size-[18px]" />
        </Link>
      </NavTooltip>

      {/* Sign out */}
      <NavTooltip label="Sign Out">
        <button
          onClick={() => signOut()}
          className="flex items-center h-9 rounded-lg transition-all duration-200 ease-out w-10 mx-auto justify-center text-muted-foreground hover:bg-loss/10 hover:text-loss active:scale-[0.98] mt-1"
        >
          <LogOut className="size-[18px]" />
        </button>
      </NavTooltip>
    </aside>
  )
}

// ─── Mobile bottom nav ─────────────────────────
export function MobileBottomNav() {
  const pathname = usePathname()

  const mobileItems = [
    { label: 'Trade',    href: '/trade',               icon: TrendingUp },
    { label: 'Home',     href: '/dashboard/overview',  icon: LayoutDashboard },
    { label: 'Stats',    href: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Payouts',  href: '/dashboard/payouts',   icon: Wallet },
    { label: 'More',     href: '/dashboard/leaderboard', icon: Medal },
  ]

  return (
    <nav className="sm:hidden w-full fixed z-20 left-0 bottom-0 border-t border-border bg-card pb-safe">
      <div className="flex items-center justify-around py-2">
        {mobileItems.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="size-5" />
              <span className="text-2xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
