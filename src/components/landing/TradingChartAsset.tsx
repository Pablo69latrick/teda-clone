'use client'

import { useEffect, useState, Suspense, lazy } from "react";

const TradingInterface = lazy(() => import("./TradingInterface"));

const TradingChartAsset = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Background glow */}
      <div
        className="absolute -inset-6 rounded-3xl blur-3xl opacity-20 -z-10"
        style={{ background: 'radial-gradient(ellipse at center, hsl(0 0% 100% / 0.06), transparent 70%)' }}
      />

      {/* Mobile: Direct interface without mockup */}
      <div className="block md:hidden w-full rounded-2xl overflow-hidden border border-border" style={{ height: '500px' }}>
        {mounted && (
          <Suspense fallback={<div className="w-full h-full animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />}>
            <TradingInterface />
          </Suspense>
        )}
      </div>

      {/* Desktop: MacBook Pro Mockup */}
      <div className="relative w-full max-w-[1080px] mx-auto hidden md:block">
        {/* Screen content */}
        <div
          className="absolute overflow-hidden bg-background"
          style={{
            top: '5%',
            left: '10.7%',
            width: '78.6%',
            height: '83.5%',
            borderRadius: '8px',
            zIndex: 3,
          }}
        >
          <div className="w-full h-full" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%', height: '133.33%' }}>
            {mounted && (
              <Suspense fallback={<div className="w-full h-full animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />}>
                <TradingInterface />
              </Suspense>
            )}
          </div>
        </div>

        {/* MacBook frame image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/macbook-pro-frame.png"
          alt="MacBook Pro"
          className="w-full h-auto relative pointer-events-none select-none"
          style={{ zIndex: 2 }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default TradingChartAsset;
