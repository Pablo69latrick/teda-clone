'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Lock } from "lucide-react";
import BookCallDialog from "./BookCallDialog";

const Pricing = () => {
  const [showBookCall, setShowBookCall] = useState(false);

  const plans = [
    {
      name: "Junior",
      capital: "$95,000",
      price: "€1,500",
      profitShare: "80%",
      traders: "22.1%",
      featured: false,
      features: [
        "Instant Funding",
        "80% profit share",
        "Priority support",
        "24h opening delay",
        "5% max drawdown",
        "Payouts in 1 day",
      ],
    },
    {
      name: "Senior",
      capital: "$205,000",
      price: "€3,000",
      profitShare: "90%",
      traders: "72.4%",
      featured: true,
      badge: "Most Popular",
      features: [
        "Instant Funding",
        "90% profit share",
        "Personal Account Manager",
        "Instant opening",
        "10% max drawdown",
        "Payouts in 1 day",
        "24/7 live platform support",
      ],
    },
    {
      name: "Associate",
      capital: "$305,000",
      price: "€5,000",
      profitShare: "95%",
      traders: "5.2%",
      featured: false,
      features: [
        "Instant Funding",
        "95% profit share",
        "Personal Account Manager",
        "Instant opening",
        "10% max drawdown",
        "Payouts in 1 day",
        "24/7 live platform support",
      ],
    },
  ];

  const invitationPlan = {
    name: "Invitation Only",
    capital: "$1,000,000",
    profitShare: "99%",
    traders: "0.3%",
    features: [
      "Instant Funding",
      "99% profit share",
      "Personal Trading Coach",
      "Personalized max drawdown",
      "Payouts in 2h",
      "24/7 live platform support",
    ],
  };

  return (
    <>
      <section className="py-24 relative overflow-hidden bg-background" id="pricing">
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(ellipse, hsl(var(--foreground) / 0.08), transparent 60%)' }}
          />
        </div>

        <div className="section-container relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-0.5 rounded-full mx-auto mb-6" style={{ background: 'hsl(var(--foreground) / 0.2)' }} />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
              Trade with the capital{" "}
              <span className="text-gradient">you deserve</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Get instant access to funded accounts, with no challenges, no time pressure,
              and no artificial constraints.
            </p>
          </motion.div>

          {/* Main pricing grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`group relative p-6 rounded-2xl transition-all duration-500 flex flex-col ${plan.featured ? 'border-2' : 'border'}`}
                style={{
                  background: 'hsl(var(--card))',
                  borderColor: plan.featured ? 'hsl(var(--foreground) / 0.3)' : 'hsl(var(--border))',
                  boxShadow: plan.featured ? '0 4px 24px -4px hsl(var(--foreground) / 0.1)' : undefined,
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full"
                      style={{
                        background: 'hsl(var(--foreground))',
                        color: 'hsl(var(--background))',
                      }}
                    >
                      <Star className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{plan.name}</h3>
                  <div className="text-3xl font-bold tracking-tight mb-1" style={{ color: plan.featured ? undefined : 'hsl(var(--foreground))' }}>
                    {plan.featured ? <span className="text-gradient">{plan.capital}</span> : plan.capital}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.profitShare} profit share</p>
                </div>

                <div className="h-px mb-6" style={{ background: 'hsl(var(--border))' }} />

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: plan.featured ? 'hsl(var(--foreground) / 0.12)' : 'hsl(var(--secondary))',
                        }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: plan.featured ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))' }} />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <motion.button
                    onClick={() => setShowBookCall(true)}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm"
                    style={
                      plan.featured
                        ? { background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }
                        : { background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' }
                    }
                    whileHover={{ opacity: 0.88 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Request Account
                  </motion.button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    {plan.traders} of our traders
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Invitation Only */}
          <motion.div
            className="relative rounded-2xl p-8 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(0 0% 4%) 100%)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 blur-3xl opacity-15"
              style={{ background: 'hsl(153 100% 36%)' }}
            />

            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                  style={{
                    background: 'hsl(153 100% 36% / 0.15)',
                    color: '#00B67A',
                  }}
                >
                  <Lock className="w-3 h-3" />
                  Invitation Only
                </div>
                <h3 className="text-3xl font-bold mb-2 text-white">{invitationPlan.capital}</h3>
                <p className="text-white/60 text-sm">
                  {invitationPlan.profitShare} profit share · {invitationPlan.traders} of our traders
                </p>
              </div>
              <div>
                <ul className="grid grid-cols-2 gap-3">
                  {invitationPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-white/80">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#00B67A' }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <BookCallDialog open={showBookCall} onClose={() => setShowBookCall(false)} />
    </>
  );
};

export default Pricing;
