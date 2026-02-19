'use client'

import { motion } from "framer-motion";
import { Brain, Database, TrendingUp, Users, ExternalLink } from "lucide-react";
import ProfitFeed from "./ProfitFeed";
import TrustpilotCard from "./TrustpilotCard";
import Link from "next/link";

const BeforeAfter = () => (
  <section id="case-studies" className="py-24 relative overflow-hidden">
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary) / 0.5) 30%, hsl(var(--secondary) / 0.5) 70%, hsl(var(--background)) 100%)" }} />
    <div className="w-[90%] max-w-6xl mx-auto relative z-10">
      <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3">
          Learn, Trade,{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))" }}>
            Win Safely.
          </span>
        </h2>
        <p className="text-base text-muted-foreground">Backed by our Hedge Fund Partner.</p>
      </motion.div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 mb-16">
        {/* Profit Feed */}
        <motion.div className="rounded-2xl overflow-hidden flex flex-col relative"
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <motion.div className="absolute -inset-[1px] rounded-2xl opacity-60 -z-10"
            style={{ background: "linear-gradient(90deg, transparent 0%, hsl(142 70% 45% / 0.6) 25%, transparent 50%, hsl(142 70% 45% / 0.6) 75%, transparent 100%)", backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
          <div className="flex flex-col h-full"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "1rem", height: "450px" }}>
            <div className="p-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-base">Recent Payouts</h3>
                  <p className="text-xs text-muted-foreground">Funded trader profits</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142 70% 45%)" }} />
                  <span className="text-xs font-medium text-muted-foreground">Live</span>
                </div>
              </div>
            </div>
            <div className="flex-1"><ProfitFeed /></div>
          </div>
        </motion.div>

        {/* Trustpilot */}
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <TrustpilotCard />
        </motion.div>
      </div>

      {/* Sigma Capital section */}
      <motion.div className="max-w-5xl mx-auto" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(220 25% 8%) 0%, hsl(220 25% 4%) 100%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}>
          <motion.div className="absolute -inset-[1px] rounded-2xl -z-10"
            style={{ background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.3) 25%, transparent 50%, hsl(0 0% 100% / 0.3) 75%, transparent 100%)", backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
          <div className="absolute top-0 right-0 w-64 h-64 blur-3xl opacity-10 pointer-events-none" style={{ background: "white" }} />
          <div className="relative z-10 p-8">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
                  style={{ background: "hsl(0 0% 100% / 0.1)", border: "1px solid hsl(0 0% 100% / 0.2)", color: "white" }}>
                  <span className="w-2 h-2 rounded-full animate-pulse bg-white" />
                  Backed by Sigma Capital
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">Giving meaning to your trading</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  TEDA is backed by Sigma Capital, building the most advanced self-learning trading algorithm powered by AI and deep learning. Your trading data helps evolve the next generation of trading technology.
                </p>
                <a href="https://sigma-capital.uk" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:opacity-85 transition-opacity">
                  Learn more about Sigma Capital
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white text-center mb-4">A win-win model</h4>
                {[
                  { icon: Users, title: "For Traders", description: "Gain access to education, capital, and a fair framework" },
                  { icon: Brain, title: "For Sigma Capital", description: "Enhance models through the behavior of top-tier traders" },
                ].map((benefit, i) => (
                  <motion.div key={i} className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background: "hsl(0 0% 100% / 0.03)" }}
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-white">
                      <benefit.icon className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-0.5 text-white">{benefit.title}</h4>
                      <p className="text-xs text-white/50">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Data flow */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: "hsl(0 0% 100% / 0.08)" }}>
              <div className="flex items-center justify-center gap-6 sm:gap-10 relative py-6 px-4">
                {[{ icon: Users, label: "Traders" }, { icon: Database, label: "Data" }, { icon: Brain, label: "AI" }, { icon: TrendingUp, label: "Evolution" }].map((item, i) => (
                  <div key={i} className="flex flex-col items-center relative z-10">
                    {i < 3 && (
                      <div className="absolute left-[calc(50%+24px)] top-6 w-[calc(100%-12px)] sm:w-16 h-px overflow-hidden">
                        <div className="w-full h-full" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
                        <motion.div className="absolute top-0 left-0 h-full w-8"
                          style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.8), transparent)" }}
                          animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: i * 0.5 }} />
                      </div>
                    )}
                    <motion.div className="w-12 h-12 rounded-full flex items-center justify-center relative"
                      style={{ background: i === 3 ? "white" : "hsl(220 25% 10%)", border: "2px solid hsl(0 0% 100% / 0.2)", boxShadow: i === 3 ? "0 0 20px rgba(255,255,255,0.3)" : "none" }}
                      initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} whileHover={{ scale: 1.1 }}>
                      <item.icon className="w-5 h-5" style={{ color: i === 3 ? "black" : "white" }} />
                    </motion.div>
                    <span className="text-[10px] text-white/50 mt-2 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default BeforeAfter;
