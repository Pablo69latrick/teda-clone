'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FounderManifesto = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="section-container py-16 lg:py-20">
      <motion.div
        className="max-w-3xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        {/* Section label */}
        <motion.p
          className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          From the founders of TEDA
        </motion.p>

        {/* Hook — always visible */}
        <blockquote className="relative">
          <span
            className="absolute -top-4 -left-2 text-6xl font-serif text-foreground/10 select-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <p className="text-xl sm:text-2xl lg:text-3xl font-medium leading-relaxed text-foreground/90 italic">
            Traders have never lacked motivation, but far too often they have lacked a fair, clear, and efficient framework to succeed.
          </p>
        </blockquote>

        {/* Expandable content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-8 space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
                <p>
                  Retail traders&apos; ignorance and confusion became the fuel of a corrupted industry. An endless chase for the latest &apos;hot&apos; strategy or the next miracle setup was sold as the only way out of chronic unprofitability.
                </p>
                <p>
                  Access to capital turned into a rigged game, poisoned by dishonest prop firms and challenges deliberately engineered to be unwinnable.
                </p>
                <p className="text-foreground/80 font-medium">
                  Today, to shape the new era of your trading, we finally bring together what has always been separated: access to high-quality knowledge and access to instant capital, within a single platform.
                </p>
              </div>
              <span
                className="inline-block mt-6 text-6xl font-serif text-foreground/10 select-none"
                aria-hidden="true"
              >
                &rdquo;
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{isExpanded ? "Close" : "Read our thesis"}</span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default FounderManifesto;
