'use client'

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

/* ── Static pre-defined payout entries (matches original TEDA format) ── */
const ENTRIES = [
  { initials: "GW", flag: "🇬🇧", name: "George Wilson",      size: "$50,000",  asset: "GBP/USD",  profit: "+$11,464", pct: "+4.03%" },
  { initials: "SL", flag: "🇫🇷", name: "Sophie Laurent",     size: "$100,000", asset: "XAU/USD",  profit: "+$8,320",  pct: "+2.91%" },
  { initials: "MR", flag: "🇮🇹", name: "Marco Rossi",        size: "$25,000",  asset: "NAS100",   profit: "+$3,150",  pct: "+3.77%" },
  { initials: "JM", flag: "🇺🇸", name: "James Mitchell",     size: "$200,000", asset: "US30",     profit: "+$19,240", pct: "+2.44%" },
  { initials: "EK", flag: "🇩🇪", name: "Elena Kaufmann",     size: "$100,000", asset: "EUR/USD",  profit: "+$7,880",  pct: "+2.76%" },
  { initials: "OB", flag: "🇬🇧", name: "Oliver Brown",       size: "$50,000",  asset: "BTC/USD",  profit: "+$6,540",  pct: "+3.58%" },
  { initials: "CS", flag: "🇪🇸", name: "Carlos Santos",      size: "$150,000", asset: "XAU/USD",  profit: "+$14,100", pct: "+3.12%" },
  { initials: "LF", flag: "🇮🇹", name: "Luca Ferrari",       size: "$25,000",  asset: "USD/JPY",  profit: "+$2,870",  pct: "+3.44%" },
  { initials: "HM", flag: "🇩🇪", name: "Hans Mueller",       size: "$100,000", asset: "SPX500",   profit: "+$9,650",  pct: "+2.97%" },
  { initials: "AT", flag: "🇺🇸", name: "Alex Thompson",      size: "$200,000", asset: "NAS100",   profit: "+$22,800", pct: "+3.26%" },
  { initials: "PV", flag: "🇳🇱", name: "Pieter van Berg",    size: "$50,000",  asset: "GBP/USD",  profit: "+$5,210",  pct: "+2.88%" },
  { initials: "WT", flag: "🇬🇧", name: "William Taylor",     size: "$305,000", asset: "XAU/USD",  profit: "+$34,200", pct: "+3.65%" },
];

const ProfitFeed = () => (
  <div className="w-full h-full overflow-hidden relative">
    {/* Gentle auto-scroll upward — CSS animation, no JS randomness */}
    <motion.div
      className="flex flex-col"
      animate={{ y: [0, -(ENTRIES.length * 72)] }}
      transition={{ duration: ENTRIES.length * 2.5, repeat: Infinity, ease: "linear" }}
    >
      {/* Duplicate list for seamless loop */}
      {[...ENTRIES, ...ENTRIES].map((e, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-5 border-b"
          style={{
            height: "72px",
            borderColor: "hsl(var(--border) / 0.5)",
            flexShrink: 0,
          }}
        >
          {/* Avatar + flag */}
          <div className="relative flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs"
              style={{ background: "rgba(0,182,122,0.12)", color: "#00B67A" }}
            >
              {e.initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">{e.flag}</span>
          </div>

          {/* Name & account size */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground text-sm truncate">{e.name}</div>
            <div className="text-xs text-muted-foreground">{e.size}</div>
          </div>

          {/* Asset badge */}
          <div className="hidden sm:block flex-shrink-0">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
              style={{ background: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }}
            >
              {e.asset}
            </span>
          </div>

          {/* Profit */}
          <div className="text-right flex items-center gap-2 flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 hidden sm:block" style={{ color: "#00B67A" }} />
            <div>
              <div className="font-mono font-semibold text-sm" style={{ color: "#00B67A" }}>
                {e.profit}
              </div>
              <div className="text-xs" style={{ color: "rgba(0,182,122,0.7)" }}>
                {e.pct}
              </div>
            </div>
          </div>
        </div>
      ))}
    </motion.div>

    {/* Top & bottom gradient fades */}
    <div
      className="absolute top-0 left-0 right-0 h-10 pointer-events-none z-10"
      style={{ background: "linear-gradient(to bottom, hsl(var(--card)), transparent)" }}
    />
    <div
      className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10"
      style={{ background: "linear-gradient(to top, hsl(var(--card)), transparent)" }}
    />
  </div>
);

export default ProfitFeed;
