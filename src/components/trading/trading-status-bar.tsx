'use client'

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  BLOCK 3 — Trading Status Bar                           ║
 * ║                                                         ║
 * ║  Bottom bar below the chart. Currently shows:           ║
 * ║  • Live UTC clock (updates every second)                ║
 * ║                                                         ║
 * ║  Future additions: spread, latency, connection status…  ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { useState, useEffect } from 'react'

// ─── UTC Clock ──────────────────────────────────────────────────────────────

function UTCClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setTime(
        `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
        `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="text-[10px] font-mono text-[#787b86]">{time}</span>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TradingStatusBar() {
  return (
    <div className="shrink-0 h-6 flex items-center justify-between px-3 bg-[#131722] border-t border-[#2a2e39]">
      {/* Left side — future: spread, latency */}
      <div />

      {/* Right side — UTC clock */}
      <UTCClock />
    </div>
  )
}
