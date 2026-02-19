'use client'

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import BookCallDialog from "./BookCallDialog";

/* ── Live ticker ── */
const baseTickers = [
  { pair: "XAU/USD", price: 3312.40, decimals: 2, change: 1.24  },
  { pair: "EUR/USD", price: 1.08542, decimals: 5, change: 0.03  },
  { pair: "NAS100",  price: 19847.2, decimals: 1, change: -0.41 },
  { pair: "US30",    price: 42310.5, decimals: 1, change: 0.18  },
  { pair: "BTC/USD", price: 103540,  decimals: 0, change: 2.11  },
];
type TickerItem = { pair: string; price: number; decimals: number; change: number };
const fmtPrice = (p: number, d: number) =>
  d === 0 ? Math.round(p).toLocaleString() : p.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtChange = (c: number) => (c >= 0 ? `+${c.toFixed(2)}%` : `${c.toFixed(2)}%`);

const navLinks = [
  { label: "Education",  anchor: "#education"  },
  { label: "Funding",    anchor: "#pricing"    },
  { label: "Conditions", anchor: "#conditions" },
];

const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-10 h-10" />;
  return (
    <motion.button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
      style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <svg className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" style={{ color: "hsl(var(--foreground))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <svg className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" style={{ color: "hsl(var(--foreground))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </motion.button>
  );
};

const LandingHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBookCall, setShowBookCall] = useState(false);
  const [tickers, setTickers] = useState<TickerItem[]>(baseTickers);

  useEffect(() => {
    const handle = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const jitter = (Math.random() - 0.5) * 0.012 * t.price;
          const newPrice = Math.max(0.00001, t.price + jitter);
          const changeJitter = (Math.random() - 0.5) * 0.08;
          return { ...t, price: newPrice, change: +(t.change + changeJitter).toFixed(2) };
        })
      );
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (anchor: string) => {
    setIsMobileMenuOpen(false);
    document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: isScrolled ? 'hsl(var(--background) / 0.95)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'none',
        }}
      >
        {/* ── Main nav row ── */}
        <div className="section-container" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
          <div className="flex items-center justify-between" style={{ height: "52px" }}>

            {/* Logo */}
            <motion.a
              href="/"
              className="flex items-center gap-2.5 group flex-shrink-0"
              whileHover={{ opacity: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/teda-logo.jpg"
                alt="TEDA"
                className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
              />
              <span className="text-sm font-semibold tracking-tight hidden sm:block" style={{ color: 'hsl(var(--foreground))' }}>
                TEDA
              </span>
            </motion.a>

            {/* Desktop nav — centered */}
            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.anchor)}
                  className="px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Desktop right */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <Link
                href="/login"
                className="text-sm font-medium italic px-3.5 py-1.5 rounded-full transition-all duration-150"
                style={{
                  background: 'hsl(var(--foreground) / 0.06)',
                  color: 'hsl(var(--foreground) / 0.7)',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                Thesis
              </Link>
              <div className="w-px h-4" style={{ background: 'hsl(var(--border))' }} />
              <ThemeToggle />
              <div className="w-px h-4" style={{ background: 'hsl(var(--border))' }} />
              <motion.button
                onClick={() => setShowBookCall(true)}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-150"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
                whileHover={{ opacity: 0.88 }}
                whileTap={{ scale: 0.97 }}
              >
                Request Access
              </motion.button>
            </div>

            {/* Mobile right */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <motion.button
                onClick={() => setShowBookCall(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
                whileTap={{ scale: 0.96 }}
              >
                Access
              </motion.button>
              <button
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'hsl(var(--foreground))' }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Live Ticker ── */}
        <div
          style={{
            background: "hsl(0 0% 2% / 0.98)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
          }}
        >
          <div className="section-container">
            <div className="flex items-center h-8 overflow-hidden">
              <span
                className="hidden sm:block text-[8px] uppercase tracking-[0.18em] flex-shrink-0 pr-3 mr-3 font-medium"
                style={{ color: "hsl(0 0% 28%)", borderRight: "1px solid hsl(0 0% 14%)" }}
              >
                Live Markets
              </span>
              <div className="flex items-center gap-3 sm:gap-5 md:gap-6 flex-1 overflow-x-auto scrollbar-none sm:justify-center">
                {tickers.map((t) => {
                  const positive = t.change >= 0;
                  return (
                    <div key={t.pair} className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      <span className="text-[9px] sm:text-[10px] font-mono font-medium" style={{ color: "hsl(0 0% 42%)" }}>
                        {t.pair}
                      </span>
                      <motion.span
                        key={t.price.toFixed(t.decimals)}
                        className="hidden sm:inline text-[10px] font-semibold font-mono tabular-nums"
                        style={{ color: "hsl(0 0% 78%)" }}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.35 }}
                      >
                        {fmtPrice(t.price, t.decimals)}
                      </motion.span>
                      <motion.span
                        key={t.change}
                        className="text-[9px] sm:text-[10px] font-mono tabular-nums"
                        style={{ color: positive ? "#00B67A" : "hsl(0 65% 55%)" }}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.35 }}
                      >
                        {fmtChange(t.change)}
                      </motion.span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 pl-3 ml-3" style={{ borderLeft: "1px solid hsl(0 0% 14%)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00B67A" }} />
                <span className="hidden sm:block text-[8px] uppercase tracking-wider font-medium" style={{ color: "#00B67A" }}>Live</span>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 z-40 md:hidden"
            style={{
              top: "84px",
              background: 'hsl(var(--background) / 0.97)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid hsl(var(--border))',
            }}
          >
            <div className="section-container py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.anchor)}
                  className="block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 mt-1" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <button
                  onClick={() => { setShowBookCall(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-sm font-semibold px-4 py-3 rounded-lg"
                  style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
                >
                  Request Access
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BookCallDialog open={showBookCall} onClose={() => setShowBookCall(false)} />
    </>
  );
};

export default LandingHeader;
