'use client'

import { useRef, useState, lazy, Suspense } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Play, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import BookCallDialog from "./BookCallDialog";

const TradingChartAsset = lazy(() => import("./TradingChartAsset"));

/* ── Education Asset (inline) ── */
const courses = [
  { id: "01", title: "Order Flow Mastery", instructor: "Marcus W.", duration: "12h 30m", modules: 14, progress: 78, status: "in_progress" as const },
  { id: "02", title: "The Best Trading Setups", instructor: "Emma T.", duration: "8h 15m", modules: 9, progress: 100, status: "complete" as const },
  { id: "03", title: "Live Trading Recaps", instructor: "Alex R.", duration: "15h 00m", modules: 18, progress: 45, status: "in_progress" as const },
  { id: "04", title: "Risk Management Pro", instructor: "Sarah K.", duration: "6h 45m", modules: 8, progress: 0, status: "locked" as const },
];

const EducationCard = ({ onCTA }: { onCTA: () => void }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = courses[activeIdx];
  return (
    <div className="relative h-full rounded-2xl overflow-hidden flex flex-col" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground">ACADEMY</span>
        <button onClick={onCTA} className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-60 transition-opacity">
          Access platform <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[52%] flex flex-col" style={{ borderRight: "1px solid hsl(var(--border))" }}>
          {courses.map((c, i) => {
            const isActive = i === activeIdx;
            return (
              <button key={c.id} onClick={() => setActiveIdx(i)} className="w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors"
                style={{ background: isActive ? "hsl(var(--secondary))" : "transparent", borderBottom: i < courses.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                <div className="mt-0.5 flex-shrink-0">
                  {c.status === "complete" ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00B67A" }} /> :
                    c.status === "in_progress" ? <div className="w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center" style={{ borderColor: "hsl(var(--foreground))" }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--foreground))" }} /></div> :
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{c.id}</span>
                    <span className="text-[10px] text-muted-foreground">· {c.duration}</span>
                  </div>
                  <div className="text-xs font-medium truncate" style={{ color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>{c.title}</div>
                  {c.progress > 0 && <div className="mt-2 h-0.5 rounded-full overflow-hidden w-full" style={{ background: "hsl(var(--border))" }}>
                    <motion.div className="h-full rounded-full" style={{ background: c.progress === 100 ? "#00B67A" : "hsl(var(--foreground))" }}
                      initial={{ width: 0 }} animate={{ width: `${c.progress}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                  </div>}
                </div>
                <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: isActive ? "hsl(var(--foreground))" : "hsl(var(--border))", opacity: isActive ? 1 : 0.5 }} />
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeIdx} className="flex-1 flex flex-col p-5"
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="text-[10px] font-mono mb-2 text-muted-foreground">MODULE {active.id} / 0{courses.length}</div>
            <h3 className="text-sm font-semibold leading-tight mb-1">{active.title}</h3>
            <div className="text-[11px] mb-4 text-muted-foreground">{active.instructor}</div>
            <div className="space-y-2 mb-5">
              {[{ label: "Duration", value: active.duration }, { label: "Modules", value: `${active.modules} lessons` }, { label: "Progress", value: `${active.progress}%` }].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
                  <span className="text-[11px] font-medium font-mono">{m.value}</span>
                </div>
              ))}
            </div>
            {active.progress > 0 && <div className="mb-5 h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
              <motion.div className="h-full rounded-full" style={{ background: active.progress === 100 ? "#00B67A" : "hsl(var(--foreground))" }}
                initial={{ width: 0 }} animate={{ width: `${active.progress}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
            </div>}
            <div className="mt-auto">
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium"
                style={{ background: active.status === "locked" ? "hsl(var(--secondary))" : "hsl(var(--foreground))", color: active.status === "locked" ? "hsl(var(--muted-foreground))" : "hsl(var(--background))" }}>
                <span>{active.status === "complete" ? "Review module" : active.status === "locked" ? "Locked" : "Continue"}</span>
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center gap-4">
          {[{ label: "Courses", value: "24" }, { label: "Hours", value: "180+" }, { label: "Mentors", value: "4" }].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="text-xs font-semibold font-mono">{s.value}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Updated weekly</span>
        </div>
      </div>
    </div>
  );
};

/* ── Platform Dashboard Asset (inline) ── */
const trades = [
  { pair: "EUR/USD", side: "LONG", pnl: "+$4,280", date: "Feb 12", positive: true },
  { pair: "XAU/USD", side: "SHORT", pnl: "+$11,640", date: "Feb 10", positive: true },
  { pair: "NAS100", side: "LONG", pnl: "+$3,970", date: "Feb 07", positive: true },
  { pair: "GBP/USD", side: "SHORT", pnl: "-$430", date: "Feb 05", positive: false },
  { pair: "US30", side: "LONG", pnl: "+$2,190", date: "Feb 03", positive: true },
];

const PlatformCard = ({ onCTA }: { onCTA: () => void }) => (
  <div className="relative h-full rounded-2xl overflow-hidden flex flex-col" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground">PLATFORM</span>
        <span className="w-1 h-1 rounded-full" style={{ background: "hsl(var(--border))" }} />
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00B67A" }} />
          <span className="text-[10px] font-mono text-muted-foreground">Live</span>
        </div>
      </div>
      <button onClick={onCTA} className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-60 transition-opacity">
        Access platform <ArrowRight className="w-3 h-3" />
      </button>
    </div>
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent Trades</span>
        <span className="text-[10px] font-mono text-muted-foreground">5 of 34</span>
      </div>
      <div className="grid grid-cols-4 px-5 pb-1.5">
        {["Instrument", "Side", "P&L", "Date"].map(h => (
          <span key={h} className="text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{h}</span>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {trades.map((t, i) => (
          <motion.div key={i} className="grid grid-cols-4 px-5 py-2.5 items-center"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
            initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.06 }}>
            <span className="text-xs font-medium font-mono">{t.pair}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded w-fit"
              style={{ background: t.side === "LONG" ? "hsl(153 100% 36% / 0.12)" : "hsl(0 65% 55% / 0.1)", color: t.side === "LONG" ? "#00B67A" : "hsl(0 65% 55%)" }}>
              {t.side}
            </span>
            <span className="text-xs font-semibold font-mono" style={{ color: t.positive ? "#00B67A" : "hsl(0 65% 55%)" }}>{t.pnl}</span>
            <span className="text-[10px] text-muted-foreground">{t.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
    <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid hsl(var(--border))" }}>
      <div className="flex items-center gap-4">
        {[{ label: "Total P&L", value: "+$21,660" }, { label: "Trades", value: "34" }, { label: "Days", value: "28 / 30" }].map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="text-xs font-semibold font-mono">{s.value}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "hsl(153 100% 36% / 0.12)", color: "#00B67A" }}>FUNDED</div>
    </div>
  </div>
);

/* ── Main Component ── */
const AllInOnePlatform = () => {
  const mockupRef = useRef<HTMLDivElement>(null);
  const [showBookCall, setShowBookCall] = useState(false);
  const { scrollYProgress } = useScroll({ target: mockupRef, offset: ["start 0.8", "start 0.2"] });
  const scale   = useTransform(scrollYProgress, [0, 1], [0.75, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <>
      <section className="py-32 relative overflow-hidden bg-background">
        <div className="max-w-[90%] max-w-7xl mx-auto relative z-10">
          <motion.div className="mb-20"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8" style={{ background: "hsl(var(--foreground))" }} />
              <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">Platform</span>
            </div>
            <div className="text-center">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
                One platform.
                <br />
                <span className="text-muted-foreground">Everything you need.</span>
              </h2>
            </div>
          </motion.div>

          <div className="h-px w-full mb-16" style={{ background: "hsl(var(--border))" }} />

          {/* MacBook mockup — desktop only */}
          <motion.div ref={mockupRef} className="hidden lg:block mb-6 px-4 sm:px-8" style={{ scale, opacity }}>
            <Suspense fallback={
              <div className="w-full rounded-2xl animate-pulse" style={{ height: 500, background: 'hsl(var(--secondary))' }} />
            }>
              <TradingChartAsset />
            </Suspense>
          </motion.div>

          {/* Module labels */}
          <div className="flex items-center gap-6 mt-16 mb-4">
            {[{ num: "01", label: "Learning Hub" }, { num: "02", label: "Trading Area" }].map((m, i) => (
              <div key={m.num} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{m.num}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
                {i < 1 && <div className="w-4 h-px mx-2" style={{ background: "hsl(var(--border))" }} />}
              </div>
            ))}
          </div>

          {/* Two cards */}
          <div className="grid md:grid-cols-2 gap-4" style={{ minHeight: 480 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.6 }}>
              <EducationCard onCTA={() => setShowBookCall(true)} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.6 }}>
              <PlatformCard onCTA={() => setShowBookCall(true)} />
            </motion.div>
          </div>

          {/* Bottom tagline */}
          <motion.div className="mt-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-8"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <p className="text-sm text-muted-foreground">A fair framework, designed to let your best trading emerge.</p>
            <div className="flex items-center gap-6">
              {[{ value: "24", label: "Courses" }, { value: "$305K", label: "Max funding" }, { value: "95%", label: "Profit share" }].map(s => (
                <div key={s.label} className="text-right">
                  <div className="text-sm font-semibold font-mono">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <BookCallDialog open={showBookCall} onClose={() => setShowBookCall(false)} />
    </>
  );
};

export default AllInOnePlatform;
