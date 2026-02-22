'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  ShieldAlert,
  Wallet,
  Users,
  Gamepad2,
  ChevronLeft,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ADMIN_MODULES = [
  {
    label: 'Command Center',
    href: '/dashboard/admin/god-mode/command-center',
    icon: BarChart2,
    description: 'Platform KPIs & users',
  },
  {
    label: 'Risk Radar',
    href: '/dashboard/admin/god-mode/risk-radar',
    icon: ShieldAlert,
    description: 'Exposure & breach alerts',
  },
  {
    label: 'Treasurer',
    href: '/dashboard/admin/god-mode/treasurer',
    icon: Wallet,
    description: 'Revenue & payouts',
  },
  {
    label: 'Profiler',
    href: '/dashboard/admin/god-mode/profiler',
    icon: Users,
    description: 'User management',
  },
  {
    label: 'Game Designer',
    href: '/dashboard/admin/god-mode/game-designer',
    icon: Gamepad2,
    description: 'Challenge templates',
  },
]

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-0 -m-4 sm:-m-6 xl:-m-8 min-h-dvh">
      {/* Admin Sidebar */}
      <aside className="w-56 shrink-0 bg-card border-r border-border/50 flex flex-col py-5 px-3 hidden md:flex">
        {/* Header */}
        <div className="px-2 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 rounded bg-primary/15 flex items-center justify-center">
              <Zap className="size-3.5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">God Mode</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">Admin control panel</p>
        </div>

        {/* Module nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon
            const active = pathname.startsWith(mod.href)
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
                  active
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                <div className="min-w-0">
                  <div className={cn('text-xs font-medium leading-none mb-0.5', active && 'text-foreground')}>{mod.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{mod.description}</div>
                </div>
                {active && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-primary shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Back to dashboard */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <Link
            href="/dashboard/overview"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs"
          >
            <ChevronLeft className="size-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 xl:p-8 overflow-auto">
        {/* Mobile module tabs */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-3 mb-4 -mx-4 px-4">
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon
            const active = pathname.startsWith(mod.href)
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {mod.label}
              </Link>
            )
          })}
        </div>

        {children}
      </div>
    </div>
  )
}
