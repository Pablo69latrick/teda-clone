'use client'

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqItems = [
  {
    question: "How does instant funding work?",
    answer: "No evaluation, no challenge. Once you select your account tier — Junior ($95K), Senior ($205K) or Associate ($305K) — your account is activated instantly (Senior & Associate) or within 24 hours (Junior). You trade on a live simulated environment from day one.",
  },
  {
    question: "What are the trading conditions?",
    answer: "All accounts trade with 1:5 simulated leverage, a $0.07/share simulated commission on equities, zero spread mark-up, and no minimum activity requirement. Junior accounts carry a 5% static drawdown; Senior and Associate accounts carry a 10% static drawdown. You can retain up to 20% of positions overnight and there are no news restrictions.",
  },
  {
    question: "What's the profit split?",
    answer: "Junior traders keep 80% of simulated profits, Senior traders keep 90%, and Associate traders keep 95%. Invitation Only accounts — reserved for our highest performers — receive 99%. Payouts are processed monthly with a 1-day processing window and zero payout fee.",
  },
  {
    question: "How much capital can I access?",
    answer: "Accounts start at $95,000 (Junior), $205,000 (Senior), or $305,000 (Associate). A $1,000,000 Invitation Only account is available exclusively to traders who have demonstrated exceptional, consistent performance on the platform.",
  },
  {
    question: "Is there dedicated support?",
    answer: "Junior traders have access to our standard support team. Senior and Associate traders are assigned a personal account manager and benefit from 24/7 live platform support and priority response. Associate traders are also eligible for an HQ visit.",
  },
];

const FundingFAQ = () => {
  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <section className="py-12 relative overflow-hidden bg-background" id="funding">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary) / 0.3) 50%, hsl(var(--background)) 100%)' }}
      />

      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto">
          {faqItems.map((item, i) => {
            const isOpen = openItems.includes(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => toggleItem(i)}
                  className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
                  style={{ borderBottom: '1px solid hsl(var(--border))' }}
                >
                  <span className={`text-base font-medium transition-colors duration-300 ${isOpen ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {item.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
                        opacity: { duration: 0.3, delay: 0.05 },
                      }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pt-2 text-muted-foreground text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FundingFAQ;
