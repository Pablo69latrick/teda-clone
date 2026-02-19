'use client'

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import TrustLogos from "./TrustLogos";
import FounderManifesto from "./FounderManifesto";
import AllInOnePlatform from "./AllInOnePlatform";
import BookCallDialog from "./BookCallDialog";
import RotatingHeadline from "./RotatingHeadline";

/* ── Animated counter ── */
const useCounter = (target: number, duration = 1800) => {
  const [val, setVal] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
};

const Hero = () => {
  const [showBookCall, setShowBookCall] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const funded  = useCounter(1000);
  const payouts = useCounter(300);

  return (
    <>
      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section
        ref={containerRef}
        className="relative overflow-hidden flex flex-col bg-background"
        style={{
          minHeight: "100svh",
          paddingTop: "5.25rem", /* navbar 52px + ticker 32px = 84px */
        }}
      >
        {/* ── Architectural grid ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground) / 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground) / 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 80%)",
          }}
        />

        {/* ── Deep radial glow ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 30%, hsl(var(--foreground) / 0.03) 0%, transparent 70%)",
          }}
        />

        {/* ── Subtle ambient pulse ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 50% 35%, hsl(var(--foreground) / 0.02) 0%, transparent 65%)",
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ── Parallax content ── */}
        <motion.div
          style={{ y, opacity: fadeOut }}
          className="relative z-10 flex flex-col justify-center flex-1 py-4"
        >
          <div className="w-[90%] max-w-6xl mx-auto pt-6 pb-10">
            <div className="max-w-4xl mx-auto">

              {/* Badge */}
              <motion.div
                className="flex justify-center mb-7"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-[0.14em] uppercase"
                  style={{
                    background: "hsl(153 100% 36% / 0.1)",
                    border: "1px solid hsl(153 100% 36% / 0.25)",
                    color: "#00B67A",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00B67A" }} />
                  Invite Only
                </div>
              </motion.div>

              {/* ── Headline ligne 1 ── */}
              <motion.div
                className="text-center mb-2"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
              >
                <h1
                  className="font-semibold tracking-tight"
                  style={{
                    fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
                    color: "hsl(var(--foreground))",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                  }}
                >
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>Get </span>
                  <em className="italic" style={{ color: "hsl(var(--foreground))" }}>trained</em>
                  <span style={{ color: "hsl(var(--muted-foreground))" }}> and </span>
                  <em className="italic" style={{ color: "hsl(var(--foreground))" }}>funded</em>
                </h1>
              </motion.div>

              {/* ── Rotating headline ligne 2 ── */}
              <motion.div
                className="text-center mb-7"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              >
                <div
                  className="font-semibold tracking-tight"
                  style={{
                    fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
                    color: "hsl(var(--foreground))",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                  }}
                >
                  <RotatingHeadline />
                </div>
              </motion.div>

              {/* ── Subline ── */}
              <motion.p
                className="text-center text-sm leading-relaxed max-w-md mx-auto mb-9"
                style={{ color: "hsl(var(--muted-foreground))" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.48, duration: 0.8 }}
              >
                The first platform that brings world-class education
                and real capital together in one place.
              </motion.p>

              {/* ── CTA ── */}
              <motion.div
                className="flex items-center justify-center mb-12"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58, duration: 0.7 }}
              >
                <motion.button
                  onClick={() => setShowBookCall(true)}
                  className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
                  whileHover={{ scale: 1.02, opacity: 0.92 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Request Access
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>

              {/* ── Stats row ── */}
              <motion.div
                className="grid grid-cols-3 max-w-xl mx-auto"
                style={{ borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.72, duration: 0.8 }}
              >
                {[
                  { label: "Traders Funded",         value: funded.toLocaleString() },
                  { label: "Total Payouts",           value: payouts.toLocaleString() },
                  { label: "Up to 90% Profit Share",  value: "90%" },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="py-4 text-center"
                    style={{ borderRight: i < 2 ? "1px solid hsl(var(--border))" : "none" }}
                  >
                    <div
                      className="text-xl font-semibold font-mono tracking-tight mb-0.5"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      {s.value}
                    </div>
                    <div
                      className="text-[9px] uppercase tracking-[0.12em] leading-tight px-1"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Vignette ── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))" }}
        />
      </section>

      {/* ── Sections suivantes (dans Hero comme dans l'original) ── */}
      <TrustLogos />
      <FounderManifesto />
      <AllInOnePlatform />

      {/* Video modal */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsVideoOpen(false)} />
            <motion.div
              className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden"
              style={{ border: "1px solid hsl(var(--border))" }}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <button
                onClick={() => setIsVideoOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BookCallDialog open={showBookCall} onClose={() => setShowBookCall(false)} />
    </>
  );
};

export default Hero;
