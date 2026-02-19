'use client'

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const headlines = [
  { type: "counter", prefix: "Up to ", suffix: "K", target: 305 },
  { type: "text", text: "Without challenge" },
  { type: "text", text: "All in one place" },
] as const;

const RotatingHeadline = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [count, setCount] = useState(100);
  const [isFirstRun, setIsFirstRun] = useState(true);
  const countRef = useRef(100);

  useEffect(() => {
    if (currentIndex === 0 && headlines[0].type === "counter") {
      const target = headlines[0].target;
      const duration = isFirstRun ? 2000 : 1000;
      const startValue = 100;
      const totalSteps = duration / 32;
      const increment = (target - startValue) / totalSteps;
      countRef.current = startValue;
      setCount(startValue);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        countRef.current = Math.min(startValue + increment * step, target);
        setCount(Math.round(countRef.current));
        if (step >= totalSteps) { clearInterval(interval); setCount(target); }
      }, 32);
      return () => clearInterval(interval);
    }
  }, [currentIndex, isFirstRun]);

  useEffect(() => {
    const getDelay = () => (isFirstRun && currentIndex === 0) ? 4000 : 2000;
    const timeout = setTimeout(() => {
      if (isFirstRun && currentIndex === 0) setIsFirstRun(false);
      setCurrentIndex((prev) => (prev + 1) % headlines.length);
    }, getDelay());
    return () => clearTimeout(timeout);
  }, [currentIndex, isFirstRun]);

  const currentHeadline = headlines[currentIndex];

  return (
    <span className="relative inline-block w-full">
      <span className="relative block h-[1.15em] overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={currentIndex}
            className="absolute inset-x-0 flex items-center justify-center"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="whitespace-nowrap">
              {currentHeadline.type === "counter" ? (
                <>{currentHeadline.prefix}<span className="tabular-nums inline-block">{count}</span>{currentHeadline.suffix}</>
              ) : (
                currentHeadline.text
              )}
            </span>
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};

export default RotatingHeadline;
