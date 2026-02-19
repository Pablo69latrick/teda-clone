'use client'

const logos = [
  { name: "Forbes",       src: "/landing/logos/forbes.png",          height: "h-8",  invertClass: "dark:invert" },
  { name: "Bloomberg",    src: "/landing/logos/bloomberg.png",       height: "h-8",  invertClass: "dark:invert" },
  { name: "CNBC",         src: "/landing/logos/cnbc.png",            height: "h-14", invertClass: "dark:invert" },
  { name: "Reuters",      src: "/landing/logos/reuters.png",         height: "h-12", invertClass: "dark:invert" },
  { name: "TradingView",  src: "/landing/logos/tradingview-dark.png",height: "h-9",  invertClass: "dark:invert" },
];

const allLogos = [...logos, ...logos];

const TrustLogos = () => {
  return (
    <div className="py-10 relative">
      <p className="text-center text-xs font-medium text-muted-foreground mb-6 tracking-widest uppercase">
        Trusted by Traders
      </p>

      <div className="relative w-[90%] max-w-5xl mx-auto overflow-hidden rounded-xl">
        <div
          className="absolute left-0 top-0 bottom-0 w-32 sm:w-48 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background)) 20%, transparent 100%)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-32 sm:w-48 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background)) 20%, transparent 100%)' }}
        />

        <div className="trust-logos-scroll flex items-center gap-24">
          {allLogos.map((logo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={logo.src}
              alt={logo.name}
              className={`flex-shrink-0 ${logo.height} w-auto opacity-40 ${logo.invertClass}`}
              draggable={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustLogos;
