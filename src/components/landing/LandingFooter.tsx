'use client'

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Mail, ArrowUpRight } from "lucide-react";
import Link from "next/link";

/* ── Real-time timezone clock ── */
const useRealTime = (timezone: string) => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: timezone, hour12: true })
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: timezone, hour12: true })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, [timezone]);
  return time;
};

const LandingFooter = () => {
  const nyTime     = useRealTime("America/New_York");
  const londonTime = useRealTime("Europe/London");
  const hkTime     = useRealTime("Asia/Hong_Kong");

  const locations = [
    { name: "New York",   time: nyTime     },
    { name: "London",     time: londonTime },
    { name: "Hong Kong",  time: hkTime     },
  ];

  const links: Record<string, { label: string; href: string }[]> = {
    Platform: [
      { label: "Features",    href: "/#platform"   },
      { label: "Pricing",     href: "/#pricing"    },
      { label: "Conditions",  href: "/conditions"  },
      { label: "Trainers",    href: "/#education"  },
    ],
    Company: [
      { label: "About",        href: "#" },
      { label: "Careers",      href: "#" },
      { label: "Partnership",  href: "#" },
      { label: "Contact",      href: "#" },
    ],
    Legal: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy",   href: "/privacy" },
      { label: "Risk Disclosure",  href: "/terms#prohibited-activities" },
      { label: "Contact",          href: "mailto:support@teda.com" },
    ],
  };

  return (
    <footer
      className="py-16 border-t relative overflow-hidden bg-background"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="section-container relative z-10">

        {/* ── Header ── */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00B67A" }} />
            Backed by Sigma Capital
          </div>
          <h3 className="text-2xl font-bold">Quantitative trading powered by data.</h3>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
          {/* Nav columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4 text-xs tracking-wide uppercase text-muted-foreground">{title}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground hover:text-muted-foreground transition-colors font-medium flex items-center gap-1 group"
                    >
                      {item.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Locations with real-time clocks */}
          <div>
            <h4 className="font-semibold mb-4 text-xs tracking-wide uppercase text-muted-foreground">Locations</h4>
            <div className="space-y-4">
              {locations.map((loc) => (
                <div key={loc.name}>
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <MapPin className="h-3.5 w-3.5" style={{ color: "#00B67A" }} />
                    {loc.name}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5 ml-5">
                    <Clock className="h-3 w-3" />
                    {loc.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Status & Contact ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-6 py-6 border-t mb-10"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div>
            <h4 className="font-semibold mb-3 text-xs">Reach us</h4>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00B67A" }} />
                <span className="text-muted-foreground">Support:</span>
                <span className="font-semibold">Online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00B67A" }} />
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-semibold">Online</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-xs">Contact</h4>
            <a
              href="mailto:hello@teda.com"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>hello@teda.com</span>
            </a>
          </div>
        </div>

        {/* ── Disclaimer box ── */}
        <motion.div
          className="p-5 rounded-xl mb-10"
          style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please note that all activity with TEDA takes place in a simulated environment and all accounts we provide to our users are simulations only with fictitious balances.
          </p>
        </motion.div>

        {/* ── Risk Warning ── */}
        <div className="text-center mb-10">
          <h4 className="font-semibold mb-3 text-xs">Risk Warning</h4>
          <p className="text-xs text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Participation in TEDA&apos;s programs involves exposure to market-related concepts and the possibility of financial loss in a real-world context if similar approaches were applied outside the platform. Any examples, testimonials, or performance figures shown are illustrative only and do not constitute a promise, forecast, or guarantee of future performance.
          </p>
        </div>

        {/* ── Copyright ── */}
        <div className="pt-6 border-t text-center" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TEDA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
