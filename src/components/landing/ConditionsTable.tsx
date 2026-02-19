'use client'

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { useState } from "react";

const tiers = [
  { name: "Junior", capital: "$95K", fullCapital: "$95,000" },
  { name: "Senior", capital: "$205K", fullCapital: "$205,000" },
  { name: "Associate", capital: "$305K", fullCapital: "$305,000" },
];

type Val = true | false | string;
interface Row { label: string; values: [Val, Val, Val]; tooltip?: string; }

const rows: Row[] = [
  { label: "Simulated leverage", values: ["1:5", "1:5", "1:5"] },
  { label: "Static drawdown", values: ["5%", "10%", "10%"] },
  { label: "Profit share", values: ["80%", "90%", "95%"] },
  { label: "Payout window", values: ["14 days", "14 days", "14 days"] },
  { label: "Payout speed", values: ["1 day", "1 day", "1 day"] },
  { label: "Payout fee", values: ["$0", "$0", "$0"] },
  { label: "Overnight positions (20%)", values: [true, true, true] },
  { label: "No news restrictions", values: [true, true, true] },
  { label: "No spread mark-up", values: [true, true, true] },
  { label: "Personal account manager", values: [false, true, true] },
  { label: "24/7 live support", values: [false, true, true] },
  { label: "Activation delay", values: ["24h", "Instant", "Instant"] },
];

const renderValue = (value: Val, compact = false) => {
  if (value === true) return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
      style={{ background: "hsl(153 100% 36% / 0.12)" }}>
      <Check className="w-3 h-3" style={{ color: "#00B67A" }} />
    </span>
  );
  if (value === false) return <Minus className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />;
  return <span className={`font-medium text-foreground flex-shrink-0 ${compact ? "text-xs" : "text-sm"}`}>{value}</span>;
};

const ConditionsTable = () => {
  const [activeTier, setActiveTier] = useState(0);
  return (
    <section id="conditions" className="py-24 relative bg-background">
      <div className="w-[90%] max-w-6xl mx-auto">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="w-12 h-0.5 rounded-full mx-auto mb-6 bg-foreground/20" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Transparent{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))" }}>
              conditions
            </span>
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">No hidden fees, no fine print. Every rule clearly defined.</p>
        </motion.div>

        {/* Mobile */}
        <div className="sm:hidden">
          <div className="flex rounded-xl p-1 mb-6 gap-1" style={{ background: "hsl(var(--secondary))" }}>
            {tiers.map((tier, i) => (
              <button key={tier.name} onClick={() => setActiveTier(i)}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: activeTier === i ? "hsl(var(--background))" : "transparent",
                  color: activeTier === i ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  boxShadow: activeTier === i ? "0 1px 4px hsl(var(--foreground) / 0.08)" : "none",
                }}>
                <div>{tier.name}</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">{tier.capital}</div>
              </button>
            ))}
          </div>
          <motion.div key={activeTier} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}>
              <div className="px-4 py-4" style={{ borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--secondary) / 0.5)" }}>
                <p className="text-[10px] uppercase tracking-[0.16em] font-medium mb-0.5 text-muted-foreground">{tiers[activeTier].name}</p>
                <p className="text-xl font-bold font-mono tracking-tight">{tiers[activeTier].fullCapital}</p>
              </div>
              {rows.map((row, rowIdx) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3 gap-3"
                  style={{ borderBottom: rowIdx < rows.length - 1 ? "1px solid hsl(var(--border) / 0.4)" : "none" }}>
                  <span className="text-xs text-muted-foreground leading-snug">{row.label}</span>
                  <div className="flex items-center justify-end flex-shrink-0">{renderValue(row.values[activeTier], true)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:block max-w-4xl mx-auto">
          <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-0 mb-1 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            <div />
            {tiers.map((tier) => (
              <div key={tier.name} className="text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{tier.name}</p>
                <p className="text-base font-bold">{tier.capital}</p>
              </div>
            ))}
          </div>
          {rows.map((row, i) => (
            <motion.div key={row.label} className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-0 items-center py-3 px-2"
              style={{ borderBottom: i < rows.length - 1 ? "1px solid hsl(var(--border) / 0.3)" : "none" }}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.02 }}>
              <div className="flex items-center gap-1.5 pr-4">
                <span className="text-sm text-muted-foreground">{row.label}</span>
              </div>
              {row.values.map((val, vi) => (
                <div key={vi} className="flex items-center justify-center">{renderValue(val)}</div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ConditionsTable;
