'use client'

import { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, DollarSign, Globe, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// ─── Types ──────────────────────────────────────────────────────────────────

type Impact = 'low' | 'medium' | 'high'

interface EconEvent {
  id: string
  time: string // HH:MM UTC
  currency: string
  flag: string
  event: string
  impact: Impact
  actual: string | null
  forecast: string | null
  previous: string | null
  dateOffset: number // 0 = today, 1 = tomorrow, -1 = yesterday
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const EVENTS: EconEvent[] = [
  // Yesterday
  { id: 'e1',  time: '08:30', currency: 'GBP', flag: '🇬🇧', event: 'GDP (YoY)',                  impact: 'high',   actual: '0.3%',   forecast: '0.2%',  previous: '0.1%',  dateOffset: -1 },
  { id: 'e2',  time: '10:00', currency: 'EUR', flag: '🇪🇺', event: 'CPI (MoM)',                  impact: 'high',   actual: '0.4%',   forecast: '0.4%',  previous: '0.2%',  dateOffset: -1 },
  { id: 'e3',  time: '14:30', currency: 'USD', flag: '🇺🇸', event: 'Initial Jobless Claims',     impact: 'medium', actual: '218K',   forecast: '220K',  previous: '215K',  dateOffset: -1 },
  { id: 'e4',  time: '16:00', currency: 'USD', flag: '🇺🇸', event: 'Crude Oil Inventories',      impact: 'medium', actual: '-2.1M',  forecast: '-1.5M', previous: '1.2M',  dateOffset: -1 },

  // Today
  { id: 'e5',  time: '02:00', currency: 'CNY', flag: '🇨🇳', event: 'Trade Balance',              impact: 'medium', actual: '72.4B',  forecast: '68.0B', previous: '70.1B', dateOffset: 0 },
  { id: 'e6',  time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'CPI (MoM)',                  impact: 'high',   actual: null,     forecast: '0.3%',  previous: '0.4%',  dateOffset: 0 },
  { id: 'e7',  time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Core CPI (MoM)',             impact: 'high',   actual: null,     forecast: '0.3%',  previous: '0.3%',  dateOffset: 0 },
  { id: 'e8',  time: '10:00', currency: 'USD', flag: '🇺🇸', event: 'FOMC Meeting Minutes',       impact: 'high',   actual: null,     forecast: null,    previous: null,    dateOffset: 0 },
  { id: 'e9',  time: '13:00', currency: 'GBP', flag: '🇬🇧', event: 'BoE Interest Rate Decision', impact: 'high',  actual: null,     forecast: '5.00%', previous: '5.00%', dateOffset: 0 },
  { id: 'e10', time: '14:30', currency: 'CAD', flag: '🇨🇦', event: 'Employment Change',          impact: 'medium', actual: null,     forecast: '15.0K', previous: '22.5K', dateOffset: 0 },
  { id: 'e11', time: '15:00', currency: 'EUR', flag: '🇪🇺', event: 'ECB President Lagarde Speech', impact: 'high', actual: null,    forecast: null,    previous: null,    dateOffset: 0 },
  { id: 'e12', time: '15:30', currency: 'USD', flag: '🇺🇸', event: 'EIA Natural Gas Storage',   impact: 'low',    actual: null,     forecast: '-30B',  previous: '-22B',  dateOffset: 0 },
  { id: 'e13', time: '17:00', currency: 'USD', flag: '🇺🇸', event: '10-Year Note Auction',       impact: 'medium', actual: null,    forecast: null,    previous: '4.68%', dateOffset: 0 },

  // Tomorrow
  { id: 'e14', time: '03:30', currency: 'JPY', flag: '🇯🇵', event: 'Tankan Large Mfg Index',     impact: 'medium', actual: null,    forecast: '12',    previous: '13',    dateOffset: 1 },
  { id: 'e15', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Nonfarm Payrolls',           impact: 'high',   actual: null,    forecast: '185K',  previous: '199K',  dateOffset: 1 },
  { id: 'e16', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Unemployment Rate',          impact: 'high',   actual: null,    forecast: '4.1%',  previous: '4.1%',  dateOffset: 1 },
  { id: 'e17', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Avg Hourly Earnings (MoM)',  impact: 'high',   actual: null,    forecast: '0.3%',  previous: '0.3%',  dateOffset: 1 },
  { id: 'e18', time: '10:00', currency: 'USD', flag: '🇺🇸', event: 'Michigan Consumer Sentiment', impact: 'medium', actual: null,  forecast: '74.8',  previous: '73.2',  dateOffset: 1 },
  { id: 'e19', time: '12:30', currency: 'EUR', flag: '🇪🇺', event: 'ECB Economic Bulletin',      impact: 'low',    actual: null,    forecast: null,    previous: null,    dateOffset: 1 },
  { id: 'e20', time: '14:00', currency: 'GBP', flag: '🇬🇧', event: 'BoE MPC Member Speech',     impact: 'medium', actual: null,    forecast: null,    previous: null,    dateOffset: 1 },

  // Day +2
  { id: 'e21', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'PPI (MoM)',                 impact: 'medium', actual: null,    forecast: '0.2%',  previous: '0.3%',  dateOffset: 2 },
  { id: 'e22', time: '10:00', currency: 'USD', flag: '🇺🇸', event: 'ISM Services PMI',          impact: 'medium', actual: null,    forecast: '53.1',  previous: '52.8',  dateOffset: 2 },
  { id: 'e23', time: '12:00', currency: 'EUR', flag: '🇪🇺', event: 'German Industrial Production', impact: 'medium', actual: null, forecast: '-0.3%', previous: '0.1%',  dateOffset: 2 },

  // Day +3
  { id: 'e24', time: '00:30', currency: 'AUD', flag: '🇦🇺', event: 'RBA Interest Rate Decision', impact: 'high',  actual: null,    forecast: '4.10%', previous: '4.35%', dateOffset: 3 },
  { id: 'e25', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Trade Balance',             impact: 'medium', actual: null,    forecast: '-68.5B', previous: '-70.5B', dateOffset: 3 },
  { id: 'e26', time: '14:30', currency: 'USD', flag: '🇺🇸', event: 'Weekly Crude Oil Inventories', impact: 'medium', actual: null, forecast: '-1.2M', previous: '-2.1M', dateOffset: 3 },

  // Day +4
  { id: 'e27', time: '07:00', currency: 'EUR', flag: '🇪🇺', event: 'German CPI (MoM)',           impact: 'high',   actual: null,    forecast: '0.3%',  previous: '-0.2%', dateOffset: 4 },
  { id: 'e28', time: '08:30', currency: 'CAD', flag: '🇨🇦', event: 'BoC Rate Statement',         impact: 'high',   actual: null,    forecast: null,    previous: null,    dateOffset: 4 },
  { id: 'e29', time: '10:00', currency: 'USD', flag: '🇺🇸', event: 'Wholesale Inventories',     impact: 'low',    actual: null,    forecast: '0.1%',  previous: '-0.2%', dateOffset: 4 },

  // Day +5
  { id: 'e30', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Initial Jobless Claims',    impact: 'medium', actual: null,    forecast: '216K',  previous: '218K',  dateOffset: 5 },
  { id: 'e31', time: '08:30', currency: 'USD', flag: '🇺🇸', event: 'Core PCE (MoM)',             impact: 'high',   actual: null,    forecast: '0.3%',  previous: '0.3%',  dateOffset: 5 },
  { id: 'e32', time: '10:00', currency: 'USD', flag: '🇺🇸', event: 'Pending Home Sales',        impact: 'low',    actual: null,    forecast: '1.2%',  previous: '-4.9%', dateOffset: 5 },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDateLabel(offset: number, baseDate: Date): string {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + offset)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  if (offset === -1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function getDateFull(offset: number, baseDate: Date): string {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const impactConfig: Record<Impact, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  high:   { label: 'High',   color: 'text-loss',        bg: 'bg-loss/10 border-loss/30',      icon: AlertTriangle },
  medium: { label: 'Medium', color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30', icon: TrendingUp },
  low:    { label: 'Low',    color: 'text-muted-foreground', bg: 'bg-muted/30 border-border/50', icon: DollarSign },
}

function ImpactDots({ impact }: { impact: Impact }) {
  return (
    <div className="flex items-center gap-0.5">
      {(['low', 'medium', 'high'] as const).map((lvl, i) => {
        const active = (impact === 'low' && i === 0) || (impact === 'medium' && i <= 1) || (impact === 'high')
        return (
          <div
            key={lvl}
            className={cn(
              'size-1.5 rounded-full',
              active
                ? impact === 'high' ? 'bg-loss' : impact === 'medium' ? 'bg-yellow-400' : 'bg-muted-foreground'
                : 'bg-muted'
            )}
          />
        )
      })}
    </div>
  )
}

function ActualBadge({ actual, forecast }: { actual: string | null; forecast: string | null }) {
  if (!actual) return <span className="text-muted-foreground">—</span>
  if (!forecast) return <span className="font-semibold tabular-nums">{actual}</span>

  const actualNum = parseFloat(actual)
  const forecastNum = parseFloat(forecast)
  const beat = !isNaN(actualNum) && !isNaN(forecastNum) && actualNum > forecastNum
  const miss = !isNaN(actualNum) && !isNaN(forecastNum) && actualNum < forecastNum

  return (
    <span className={cn(
      'font-semibold tabular-nums',
      beat ? 'text-profit' : miss ? 'text-loss' : ''
    )}>
      {actual}
    </span>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

const CURRENCIES = ['All', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY']
const IMPACTS: ('all' | Impact)[] = ['all', 'high', 'medium', 'low']

export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [dayOffset, setDayOffset] = useState(0) // which day is "selected" (0 = today)
  const [filterCurrency, setFilterCurrency] = useState('All')
  const [filterImpact, setFilterImpact] = useState<'all' | Impact>('all')

  // For the week mini-calendar: show today ±3 days
  const weekDays = [-1, 0, 1, 2, 3, 4, 5]

  const selectedEvents = useMemo(() => {
    let list = EVENTS.filter(e => e.dateOffset === dayOffset)
    if (filterCurrency !== 'All') list = list.filter(e => e.currency === filterCurrency)
    if (filterImpact !== 'all') list = list.filter(e => e.impact === filterImpact)
    return list.sort((a, b) => a.time.localeCompare(b.time))
  }, [dayOffset, filterCurrency, filterImpact])

  const highImpactToday = EVENTS.filter(e => e.dateOffset === 0 && e.impact === 'high').length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Economic Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track market-moving events and data releases
          </p>
        </div>
        {highImpactToday > 0 && (
          <div className="flex items-center gap-2 bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
            <AlertTriangle className="size-4 text-loss" />
            <span className="text-xs font-medium text-loss">{highImpactToday} high-impact events today</span>
          </div>
        )}
      </div>

      {/* Week strip */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDayOffset(d => d - 1)}
          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1">
          {weekDays.map(offset => {
            const d = new Date(today)
            d.setDate(d.getDate() + offset)
            const dayEvents = EVENTS.filter(e => e.dateOffset === offset)
            const hasHigh = dayEvents.some(e => e.impact === 'high')
            const hasMedium = dayEvents.some(e => e.impact === 'medium')
            const isSelected = dayOffset === offset
            const isToday = offset === 0

            return (
              <button
                key={offset}
                onClick={() => setDayOffset(offset)}
                className={cn(
                  'flex flex-col items-center gap-1.5 min-w-[56px] px-2 py-2.5 rounded-xl border transition-all',
                  isSelected
                    ? 'bg-primary/10 border-primary/50 text-foreground'
                    : 'border-border/50 bg-card hover:bg-muted/20 text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={cn('text-sm font-bold', isToday && !isSelected && 'text-primary')}>
                  {d.getDate()}
                </span>
                <div className="flex items-center gap-0.5">
                  {hasHigh ? (
                    <div className="size-1.5 rounded-full bg-loss" />
                  ) : hasMedium ? (
                    <div className="size-1.5 rounded-full bg-yellow-400" />
                  ) : dayEvents.length > 0 ? (
                    <div className="size-1.5 rounded-full bg-muted-foreground/40" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-transparent" />
                  )}
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] text-muted-foreground">{dayEvents.length}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setDayOffset(d => d + 1)}
          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Currency filter */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 overflow-x-auto">
          {CURRENCIES.map(cur => (
            <button
              key={cur}
              onClick={() => setFilterCurrency(cur)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                filterCurrency === cur
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {cur}
            </button>
          ))}
        </div>

        {/* Impact filter */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {IMPACTS.map(imp => (
            <button
              key={imp}
              onClick={() => setFilterImpact(imp)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                filterImpact === imp
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {imp}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Filter className="size-3" />
          <span>{selectedEvents.length} events</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{getDateFull(dayOffset, today)}</span>
        </div>
      </div>

      {/* Events table */}
      <div className="rounded-xl bg-card border border-border/50">
        {/* Day header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50">
          <Calendar className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{getDateLabel(dayOffset, today)}</h2>
          <span className="text-xs text-muted-foreground">— All times UTC</span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="py-16 text-center">
            <Globe className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events match your filters</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the currency or impact filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                  <th className="text-left px-5 py-3 w-16">Time</th>
                  <th className="text-left px-3 py-3 w-16">Currency</th>
                  <th className="text-left px-3 py-3">Event</th>
                  <th className="text-center px-3 py-3 w-20">Impact</th>
                  <th className="text-right px-3 py-3 w-20">Actual</th>
                  <th className="text-right px-3 py-3 w-20">Forecast</th>
                  <th className="text-right px-5 py-3 w-20">Previous</th>
                </tr>
              </thead>
              <tbody>
                {selectedEvents.map((event, idx) => {
                  const cfg = impactConfig[event.impact]
                  const isPast = event.actual !== null
                  const isUpcoming = !isPast && dayOffset === 0

                  return (
                    <tr
                      key={event.id}
                      className={cn(
                        'border-b border-border/30 last:border-0 transition-colors',
                        isPast ? 'opacity-60 hover:opacity-100' : 'hover:bg-muted/10',
                      )}
                    >
                      <td className="px-5 py-3 tabular-nums font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {event.time}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>{event.flag}</span>
                          <span className="font-semibold text-[10px]">{event.currency}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{event.event}</span>
                          {event.impact === 'high' && isUpcoming && (
                            <span className="text-[9px] bg-loss/10 text-loss border border-loss/20 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                              High Impact
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ImpactDots impact={event.impact} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ActualBadge actual={event.actual} forecast={event.forecast} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {event.forecast ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {event.previous ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-muted-foreground">
        <span className="font-medium">Impact:</span>
        {(['high', 'medium', 'low'] as const).map(lvl => (
          <div key={lvl} className="flex items-center gap-1.5">
            <ImpactDots impact={lvl} />
            <span className="capitalize">{lvl}</span>
          </div>
        ))}
        <span className="text-muted-foreground/40">·</span>
        <span className="text-profit">Green actual</span> = beat forecast
        <span className="text-muted-foreground/40">·</span>
        <span className="text-loss">Red actual</span> = missed
      </div>
    </div>
  )
}
