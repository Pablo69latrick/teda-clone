'use client'

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const ScrollTradingCurve = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const pathLength    = useTransform(scrollYProgress, [0.05, 1], [0, 1]);
  const fillOpacity   = useTransform(scrollYProgress, [0.15, 0.8], [0, 0.15]);
  const priceOpacity  = useTransform(scrollYProgress, [0.6, 0.85], [0, 1]);
  const priceX        = useTransform(scrollYProgress, [0.05, 1], ["5%", "88%"]);

  const curvePath =
    "M 0 135 C 20 132 40 128 60 125 C 80 122 90 127 110 120 C 130 113 140 118 160 108 C 180 98 190 105 210 92 C 230 79 240 88 260 75 C 280 62 290 70 310 58 C 330 46 340 52 360 42 C 380 32 400 38 420 28 C 440 18 460 22 480 14 C 500 8 520 12 540 6 C 560 3 580 5 600 2";

  const priceLabels = [
    { y: 10, label: "$68,400" }, { y: 45, label: "$62,200" },
    { y: 85, label: "$55,800" }, { y: 125, label: "$49,100" },
  ];
  const timeLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto mb-12">
      <motion.div
        className="absolute inset-0 -inset-x-20 -inset-y-10 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 70% 40%, hsl(var(--foreground) / 0.08), transparent 60%)", opacity: fillOpacity }}
      />
      <div className="relative h-[220px] sm:h-[260px]">
        <svg viewBox="0 0 620 150" className="w-full h-full" preserveAspectRatio="xMidYMid meet" fill="none">
          <defs>
            <linearGradient id="lp-areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.12" />
              <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity="0.03" />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lp-lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.3" />
              <stop offset="40%" stopColor="hsl(var(--foreground))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.9" />
            </linearGradient>
            <filter id="lp-softGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="lp-progressClip">
              <motion.rect x="0" y="0" height="150" style={{ width: useTransform(pathLength, (v) => v * 620) }} />
            </clipPath>
          </defs>
          {[30, 60, 90, 120].map((y) => (
            <line key={y} x1="20" y1={y} x2="600" y2={y} stroke="hsl(var(--foreground))" strokeWidth="0.3" opacity="0.06" />
          ))}
          {[140, 260, 380, 500].map((x) => (
            <line key={x} x1={x} y1="5" x2={x} y2="140" stroke="hsl(var(--foreground))" strokeWidth="0.3" opacity="0.06" />
          ))}
          {priceLabels.map((p) => (
            <text key={p.y} x="8" y={p.y + 4} fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="system-ui, sans-serif" opacity="0.4">{p.label}</text>
          ))}
          {timeLabels.map((t, i) => (
            <text key={t} x={80 + i * 120} y="148" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="system-ui, sans-serif" textAnchor="middle" opacity="0.35">{t}</text>
          ))}
          <g clipPath="url(#lp-progressClip)">
            <path d={curvePath + " L 600 150 L 0 150 Z"} fill="url(#lp-areaFill)" />
          </g>
          <motion.path d={curvePath} stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#lp-softGlow)" opacity="0.15" style={{ pathLength }} />
          <motion.path d={curvePath} stroke="url(#lp-lineStroke)" strokeWidth="1.5" strokeLinecap="round" fill="none" style={{ pathLength }} />
          <g clipPath="url(#lp-progressClip)">
            <motion.circle cx="600" cy="2" r="3" fill="hsl(var(--foreground))" opacity="0.9" />
            <motion.circle cx="600" cy="2" r="6" fill="hsl(var(--foreground))" opacity="0.15">
              <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
            </motion.circle>
          </g>
        </svg>
        <motion.div
          className="absolute top-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold pointer-events-none"
          style={{
            left: priceX, opacity: priceOpacity,
            background: "hsl(var(--foreground) / 0.08)", color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))", backdropFilter: "blur(8px)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00B67A' }} />
          +247.8%
        </motion.div>
      </div>
    </div>
  );
};

export default ScrollTradingCurve;
