'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ScrollTradingCurve from "./ScrollTradingCurve";
import BookCallDialog from "./BookCallDialog";

const CTA = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <section className="py-32 relative overflow-hidden">
        {/* Theme-aware background */}
        <div className="absolute inset-0 bg-background" />

        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary) / 0.4) 50%, hsl(var(--background)) 100%)",
          }}
        />

        {/* Animated light effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Central spotlight */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "800px",
              height: "800px",
              background: "radial-gradient(circle, hsl(var(--foreground) / 0.03) 0%, transparent 50%)",
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Rotating light ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--foreground) / 0.02) 5%, transparent 10%, transparent 25%, hsl(var(--foreground) / 0.01) 30%, transparent 35%, transparent 100%)",
              }}
            />
          </motion.div>
          {/* Vertical light beams */}
          <motion.div
            className="absolute top-0 left-1/4 w-px h-full"
            style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--foreground) / 0.05), transparent)" }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-0 right-1/4 w-px h-full"
            style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--foreground) / 0.05), transparent)" }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div className="section-container relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Scroll-driven trading curve */}
            <ScrollTradingCurve />

            {/* Main headline */}
            <motion.h2
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-foreground"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Welcome to the{" "}
              <br className="hidden sm:block" />
              <span className="relative">
                <span className="text-gradient">new era</span>
                {/* Underline accent */}
                <motion.div
                  className="absolute -bottom-2 left-0 right-0 h-1 rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.3), transparent)" }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </span>{" "}
              of your trading
            </motion.h2>

            <motion.p
              className="text-lg text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              TEDA is shaping the next generation of capital providers.{" "}
              <span className="text-foreground/70">A new ecosystem for those who want to trade seriously and sustainably.</span>
            </motion.p>

            {/* CTA Button with glow effect */}
            <motion.div
              className="relative inline-block"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              {/* Glow behind button */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "hsl(var(--foreground) / 0.1)", transform: "scale(1.2)" }}
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="relative flex items-center gap-2 text-lg px-12 py-4 font-semibold rounded-full"
                  style={{
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    boxShadow: "0 0 40px hsl(var(--foreground) / 0.1), 0 4px 20px hsl(var(--foreground) / 0.15)",
                  }}
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>

            {/* Trust indicator */}
            <motion.p
              className="mt-8 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              Join thousands of traders worldwide
            </motion.p>
          </motion.div>
        </div>
      </section>

      <BookCallDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </>
  );
};

export default CTA;
