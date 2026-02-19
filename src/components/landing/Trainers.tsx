'use client'

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";

const trainers = [
  {
    name: "James Thornton",
    role: "Macro · FX",
    tenure: "14 yrs",
    firm: "JP Morgan",
    image: "/landing/trainer-james.jpg",
    returns: "+34.2%",
    period: "2023",
  },
  {
    name: "Viktor Sandström",
    role: "Index · Futures",
    tenure: "11 yrs",
    firm: "Citadel",
    image: "/landing/trainer-viktor.jpg",
    returns: "+28.7%",
    period: "2023",
  },
  {
    name: "Sophie Harrington",
    role: "Commodities · FX",
    tenure: "9 yrs",
    firm: "Goldman Sachs",
    image: "/landing/trainer-sophie.jpg",
    returns: "+19.4%",
    period: "2023",
  },
  {
    name: "Karim Al-Rashid",
    role: "Derivatives · Vol",
    tenure: "12 yrs",
    firm: "Deutsche Bank",
    image: "/landing/trainer-karim.jpg",
    returns: "+41.1%",
    period: "2023",
  },
];

const metrics = [
  { value: "18+",    label: "Certified Trainers",  sub: "TEDA Certified®" },
  { value: "1,700+", label: "Students Trained",    sub: "Across 30 countries" },
  { value: "4.9 / 5",label: "Avg. Trainer Rating", sub: "Verified student reviews" },
];

const Trainers = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const lineWidth = useTransform(scrollYProgress, [0.1, 0.5], ["0%", "100%"]);

  return (
    <section ref={sectionRef} className="py-28 relative overflow-hidden bg-background" id="education">
      <div className="section-container-wide">

        {/* ── Header editorial ── */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Animated rule */}
          <div className="h-px w-full mb-8 overflow-hidden" style={{ background: "hsl(var(--border))" }}>
            <motion.div className="h-full" style={{ width: lineWidth, background: "hsl(var(--foreground))" }} />
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-medium mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                Instructors · Top 1%
              </p>
              <h2
                className="font-semibold tracking-tight"
                style={{
                  fontSize: "clamp(1.6rem, 4.5vw, 3.6rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  color: "hsl(var(--foreground))",
                }}
              >
                Learn from{" "}
                <span style={{ color: "hsl(var(--muted-foreground))" }}>the one percent.</span>
              </h2>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 md:flex md:items-center md:gap-12 gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0" style={{ borderColor: 'hsl(var(--border))' }}>
              {metrics.map((m) => (
                <div key={m.label} className="flex flex-col gap-0.5 md:text-right">
                  <div className="text-xl sm:text-2xl font-semibold font-mono tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
                    {m.value}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.12em] mt-0.5 leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Trainer grid — 4 columns ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12">
          {trainers.map((trainer, i) => (
            <motion.div
              key={trainer.name}
              className="group relative"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="relative overflow-hidden rounded-xl cursor-pointer"
                style={{
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              >
                {/* Photo */}
                <div className="aspect-[3/4] relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trainer.image}
                    alt={trainer.name}
                    className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  {/* Return badge */}
                  <div
                    className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-mono font-semibold"
                    style={{ background: "hsl(153 100% 36% / 0.15)", color: "#00B67A", border: "1px solid hsl(153 100% 36% / 0.3)" }}
                  >
                    {trainer.returns}
                  </div>

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-sm font-semibold text-white leading-tight">{trainer.name}</div>
                    <div className="text-[10px] text-white/60 mt-0.5">{trainer.role}</div>
                    <div
                      className="mt-2 text-[9px] uppercase tracking-[0.12em] font-medium inline-block px-1.5 py-0.5 rounded"
                      style={{ background: "hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 60%)" }}
                    >
                      Ex · {trainer.firm}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderTop: "1px solid hsl(var(--border))" }}
                >
                  <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {trainer.tenure} exp.
                  </span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "hsl(var(--foreground))" }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Bottom CTA bar ── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            All instructors are verified by TEDA and have traded at institutional level.
          </p>
          <button
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70 flex-shrink-0 cursor-pointer"
            style={{ color: "hsl(var(--foreground))" }}
          >
            View all trainers
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Trainers;
