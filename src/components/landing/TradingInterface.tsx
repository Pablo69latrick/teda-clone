'use client'

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import BookCallDialog from "./BookCallDialog";

interface Instrument {
  symbol: string;
  price: string;
  spread: string;
  category: "crypto" | "forex" | "stocks" | "commodities";
}

const instruments: Instrument[] = [
  { symbol: "BTC-USD", price: "$62,970.00", spread: "0.10", category: "crypto" },
  { symbol: "ETH-USD", price: "$2,847.32", spread: "0.08", category: "crypto" },
  { symbol: "XAU-USD", price: "$2,634.50", spread: "0.35", category: "commodities" },
  { symbol: "EUR-USD", price: "$1.08420", spread: "0.00", category: "forex" },
  { symbol: "GBP-USD", price: "$1.26840", spread: "0.00", category: "forex" },
  { symbol: "ADA-USD", price: "$0.24610", spread: "0.00", category: "crypto" },
  { symbol: "SOL-USD", price: "$145.20", spread: "0.05", category: "crypto" },
  { symbol: "NAS100", price: "$18,542.00", spread: "1.20", category: "stocks" },
  { symbol: "AAPL", price: "$178.50", spread: "0.02", category: "stocks" },
  { symbol: "TSLA", price: "$248.30", spread: "0.05", category: "stocks" },
];

const categories = ["all", "crypto", "forex", "stocks", "commodities"] as const;

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-colors duration-200">
    <path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3" stroke="currentColor"/>
    <path d="M10 7L12 7" stroke="currentColor"/>
    <path d="M18 7L20 7" stroke="currentColor"/>
    <path d="M8 15L10 15" stroke="currentColor"/>
    <path d="M16 15L18 15" stroke="currentColor"/>
    <path d="M10 5L10 17" stroke="currentColor"/>
    <path d="M18 5L18 17" stroke="currentColor"/>
  </svg>
);

const InstrumentsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-colors duration-200">
    <path d="M12 2C6.47716 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="currentColor"/>
    <path d="M12 5C8.13401 5 5 8.134 5 12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5Z" stroke="currentColor"/>
    <path d="M12 2V5" stroke="currentColor"/>
    <path d="M12 19V22" stroke="currentColor"/>
    <path d="M3.33984 7L5.93792 8.5" stroke="currentColor"/>
    <path d="M18.0625 15.5L20.6606 17" stroke="currentColor"/>
    <path d="M20.6602 7L18.0621 8.5" stroke="currentColor"/>
    <path d="M5.9375 15.5L3.33942 17" stroke="currentColor"/>
  </svg>
);

const TradeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-colors duration-200">
    <path d="M16.2141 4.98239L17.6158 3.58063C18.39 2.80646 19.6452 2.80646 20.4194 3.58063C21.1935 4.3548 21.1935 5.60998 20.4194 6.38415L19.0176 7.78591M16.2141 4.98239L10.9802 10.2163C9.93493 11.2616 9.41226 11.7842 9.05637 12.4211C8.70047 13.058 8.3424 14.5619 8 16C9.43809 15.6576 10.942 15.2995 11.5789 14.9436C12.2158 14.5877 12.7384 14.0651 13.7837 13.0198L19.0176 7.78591M16.2141 4.98239L19.0176 7.78591" stroke="currentColor"/>
    <path d="M21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3" stroke="currentColor"/>
  </svg>
);

const PortfolioIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-colors duration-200">
    <path d="M10 13.3333C10 13.0233 10 12.8683 10.0341 12.7412C10.1265 12.3961 10.3961 12.1265 10.7412 12.0341C10.8683 12 11.0233 12 11.3333 12H12.6667C12.9767 12 13.1317 12 13.2588 12.0341C13.6039 12.1265 13.8735 12.3961 13.9659 12.7412C14 12.8683 14 13.0233 14 13.3333V14C14 15.1046 13.1046 16 12 16C10.8954 16 10 15.1046 10 14V13.3333Z" stroke="currentColor"/>
    <path d="M13.9 13.5H15.0826C16.3668 13.5 17.0089 13.5 17.5556 13.3842C19.138 13.049 20.429 12.0207 20.9939 10.6455C21.1891 10.1704 21.2687 9.59552 21.428 8.4457C21.4878 8.01405 21.5177 7.79823 21.489 7.62169C21.4052 7.10754 20.9932 6.68638 20.4381 6.54764C20.2475 6.5 20.0065 6.5 19.5244 6.5H4.47562C3.99351 6.5 3.75245 6.5 3.56187 6.54764C3.00682 6.68638 2.59477 7.10754 2.51104 7.62169C2.48229 7.79823 2.51219 8.01405 2.57198 8.4457C2.73128 9.59552 2.81092 10.1704 3.00609 10.6455C3.571 12.0207 4.86198 13.049 6.44436 13.3842C6.99105 13.5 7.63318 13.5 8.91743 13.5H10.1" stroke="currentColor"/>
    <path d="M3.5 11.5V13.5C3.5 17.2712 3.5 19.1569 4.60649 20.3284C5.71297 21.5 7.49383 21.5 11.0556 21.5H12.9444C16.5062 21.5 18.287 21.5 19.3935 20.3284C20.5 19.1569 20.5 17.2712 20.5 13.5V11.5" stroke="currentColor"/>
    <path d="M15.5 6.5L15.4227 6.14679C15.0377 4.38673 14.8452 3.50671 14.3869 3.00335C13.9286 2.5 13.3199 2.5 12.1023 2.5H11.8977C10.6801 2.5 10.0714 2.5 9.61309 3.00335C9.15478 3.50671 8.96228 4.38673 8.57727 6.14679L8.5 6.5" stroke="currentColor"/>
  </svg>
);

const OrderbookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-colors duration-200">
    <path d="M12 6L12 20" stroke="currentColor"/>
    <path d="M5.98056 3.28544C9.32175 3.9216 11.3131 5.25231 12 6.01628C12.6869 5.25231 14.6782 3.9216 18.0194 3.28544C19.7121 2.96315 20.5584 2.80201 21.2792 3.41964C22 4.03727 22 5.04022 22 7.04612V14.255C22 16.0891 22 17.0061 21.5374 17.5787C21.0748 18.1512 20.0564 18.3451 18.0194 18.733C16.2037 19.0787 14.7866 19.6295 13.7608 20.1831C12.7516 20.7277 12.247 21 12 21C11.753 21 11.2484 20.7277 10.2392 20.1831C9.21344 19.6295 7.79633 19.0787 5.98056 18.733C3.94365 18.3451 2.9252 18.1512 2.4626 17.5787C2 17.0061 2 16.0891 2 14.255V7.04612C2 5.04022 2 4.03727 2.72078 3.41964C3.44157 2.80201 4.2879 2.96315 5.98056 3.28544Z" stroke="currentColor"/>
  </svg>
);

const CFDModeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
    <path d="M7 18V16M12 18V15M17 18V13M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" stroke="currentColor"/>
    <path d="M5.99219 11.4863C8.14729 11.5581 13.0341 11.2328 15.8137 6.82132M13.9923 6.28835L15.8678 5.98649C16.0964 5.95738 16.432 6.13785 16.5145 6.35298L17.0104 7.99142" stroke="currentColor"/>
  </svg>
);

const SidebarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 transition-colors duration-200">
    <path d="M2 12C2 8.25027 2 6.3754 2.95491 5.06107C3.26331 4.6366 3.6366 4.26331 4.06107 3.95491C5.3754 3 7.25027 3 11 3H13C16.7497 3 18.6246 3 19.9389 3.95491C20.3634 4.26331 20.7367 4.6366 21.0451 5.06107C22 6.3754 22 8.25027 22 12C22 15.7497 22 17.6246 21.0451 18.9389C20.7367 19.3634 20.3634 19.7367 19.9389 20.0451C18.6246 21 16.7497 21 13 21H11C7.25027 21 5.3754 21 4.06107 20.0451C3.6366 19.7367 3.26331 19.3634 2.95491 18.9389C2 17.6246 2 15.7497 2 12Z" stroke="currentColor"/>
    <path d="M9.5 3.5L9.5 20.5" stroke="currentColor"/>
    <path d="M5 7C5 7 5.91421 7 6.5 7" stroke="currentColor"/>
    <path d="M5 11H6.5" stroke="currentColor"/>
    <path d="M17 10L15.7735 11.0572C15.2578 11.5016 15 11.7239 15 12C15 12.2761 15.2578 12.4984 15.7735 12.9428L17 14" stroke="currentColor"/>
  </svg>
);

const TedaLogo = () => (
  <svg width="542" height="513" viewBox="0 0 542 513" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 shrink-0 transition-transform duration-300 hover:scale-105">
    <rect width="542" height="512.301" rx="148.493" className="fill-background"/>
    <g clipPath="url(#clip0_teda)">
      <path d="M372.258 179.663C345.303 179.663 318.612 184.972 293.709 195.288C268.806 205.603 246.179 220.722 227.119 239.782C208.059 258.842 192.94 281.47 182.624 306.373C172.309 331.276 167 357.967 167 384.922L215.135 384.922C215.135 364.288 219.199 343.856 227.095 324.793C234.992 305.73 246.565 288.409 261.155 273.819C275.746 259.228 293.067 247.655 312.13 239.759C331.193 231.863 351.625 227.798 372.258 227.798L372.258 179.663Z" className="fill-foreground"/>
    </g>
    <rect x="167" y="124" width="201.779" height="48.7054" className="fill-foreground"/>
    <path d="M372.26 290.99H327.033V240.893C342.628 235.145 355.637 233.648 372.26 233.648V290.99ZM372.26 221.411C355.662 221.411 342.671 224.24 327.033 229.768V124H372.26V221.411Z" className="fill-foreground"/>
    <defs>
      <clipPath id="clip0_teda">
        <rect width="208.737" height="208.737" fill="white" transform="translate(167 179.663)"/>
      </clipPath>
    </defs>
  </svg>
);

const TradingInterface = () => {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>("all");
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(instruments[0]);
  const [mobilePanel, setMobilePanel] = useState<"chart" | "instruments">("chart");
  const [activeBottomTab, setActiveBottomTab] = useState("Assets");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showBookCall, setShowBookCall] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // TradingView Widget
  useEffect(() => {
    if (!chartContainerRef.current || !mounted) return;
    chartContainerRef.current.innerHTML = '';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: selectedInstrument.symbol.replace("-", ""),
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    chartContainerRef.current.appendChild(script);
  }, [selectedInstrument.symbol, mounted]);

  const filteredInstruments = instruments.filter((inst) =>
    selectedCategory === "all" || inst.category === selectedCategory
  );

  const navItems = [
    { icon: ChartIcon, label: "Chart", shortcut: "C", active: true },
    { icon: InstrumentsIcon, label: "Instruments", shortcut: "I", active: true },
    { icon: TradeIcon, label: "Trade", shortcut: "T", active: true },
    { icon: PortfolioIcon, label: "Portfolio", shortcut: "P", active: true },
    { icon: OrderbookIcon, label: "Orderbook", shortcut: "O", active: false },
  ];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-card flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="pt-2 pb-4 px-2 hidden lg:flex flex-col bg-card/95 backdrop-blur-xl border-r border-border/50 shadow-sm w-16 shrink-0">
        <div className="flex items-center h-10 mb-3 overflow-hidden transition-all duration-300 ease-out justify-center gap-0">
          <TedaLogo />
        </div>
        <a className="relative group mb-4 overflow-hidden rounded-lg transition-all duration-300 ease-out mx-auto w-10 h-9 flex items-center justify-center bg-muted/60 hover:bg-muted active:scale-[0.98]" href="#">
          <div className="relative flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors duration-200" />
          </div>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out z-50 whitespace-nowrap">
            <span className="text-xs font-medium">Back to Dashboard</span>
          </div>
        </a>
        <div className="h-5 mb-2 transition-all duration-300 ease-out flex justify-center">
          <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest transition-opacity duration-300 opacity-0">Layout</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item, i) => (
            <button key={i} className={`flex items-center h-9 rounded-lg transition-all duration-200 ease-out relative group overflow-hidden w-10 mx-auto justify-center ${item.active ? "bg-primary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"}`}>
              {item.active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />}
              <span className={item.active ? "text-primary" : ""}><item.icon /></span>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out z-50 whitespace-nowrap">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span>{item.label}</span>
                  <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-mono">{item.shortcut}</kbd>
                </div>
              </div>
            </button>
          ))}
        </nav>
        <div className="my-3 mx-3"><div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" /></div>
        <div className="h-5 mb-2 transition-all duration-300 ease-out flex justify-center">
          <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest transition-opacity duration-300 opacity-0">Mode</span>
        </div>
        <button className="flex items-center h-9 rounded-lg transition-all duration-200 ease-out relative group overflow-hidden w-10 mx-auto justify-center bg-accent/10 text-accent shadow-sm">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-accent" />
          <CFDModeIcon />
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out z-50 whitespace-nowrap">
            <span className="text-xs font-medium">CFD Mode</span>
          </div>
        </button>
        <div className="flex-1" />
        <div className="my-3 mx-3"><div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" /></div>
        <button className="flex items-center h-9 rounded-lg transition-all duration-200 ease-out relative group mb-1 overflow-hidden w-10 mx-auto justify-center bg-primary/10 text-foreground shadow-sm">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
          <span className="text-primary"><SidebarIcon /></span>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out z-50 whitespace-nowrap">
            <span className="text-xs font-medium">Sidebar: Compact</span>
          </div>
        </button>
        <div className="my-2 mx-3"><div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" /></div>
        <div className="flex justify-center">
          <button className="relative flex items-center cursor-pointer outline-none group transition-all duration-300 h-10 w-10 justify-center">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-foreground/10 group-hover:ring-foreground/30 transition-all overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(260 60% 55%), hsl(220 70% 55%))' }}>
                C
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between px-3 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <TedaLogo />
            <span className="text-sm font-semibold">TEDA</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.slice(0, 4).map((item, i) => (
              <button key={i} className={`p-2 rounded-lg ${item.active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                <item.icon />
              </button>
            ))}
          </div>
        </div>

        {/* Chart + Right Panel Container */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          <button onClick={() => setMobilePanel("chart")} className={`md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-lg transition-all ${mobilePanel === "chart" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button onClick={() => setMobilePanel("instruments")} className={`md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-lg transition-all ${mobilePanel === "instruments" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          {/* Main Chart Area */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${mobilePanel === "instruments" ? "hidden md:flex" : "flex"}`}>
            <div className="flex-1 min-h-[300px] relative">
              <div ref={chartContainerRef} className="tradingview-widget-container absolute inset-0" style={{ width: "100%", height: "100%" }} />
            </div>

            {/* Bottom Stats Bar */}
            <div className="h-auto md:h-10 border-t border-border bg-card flex flex-col md:flex-row md:items-center px-2 md:px-3 py-1.5 md:py-0 text-xs gap-2 md:gap-0">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                {["Positions", "Orders", "History", "Assets"].map((tab) => (
                  <button key={tab} onClick={() => setActiveBottomTab(tab)}
                    className={`px-2 md:px-3 py-1.5 text-xs transition-colors rounded whitespace-nowrap border-b-2 ${activeBottomTab === tab ? "text-foreground font-medium border-foreground" : "text-muted-foreground hover:text-foreground border-transparent"}`}>
                    {tab}<span className="ml-1 text-[10px] opacity-50">0</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 md:gap-6 md:ml-auto overflow-x-auto scrollbar-hide">
                {[
                  { label: "EQUITY", value: "$0.00" },
                  { label: "P/L", value: "$0.00" },
                  { label: "MARGIN", value: "$0.00" },
                  { label: "FUNDING", value: "-0.0013%", highlight: "red" },
                  { label: "NEXT", value: "05:19:21" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1 whitespace-nowrap">
                    <span className="text-muted-foreground text-[10px]">{stat.label}</span>
                    <span className={`font-medium ${stat.highlight === "red" ? "text-red-500" : ""}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Data Panel */}
            <div className="h-32 border-t border-border bg-card overflow-auto">
              {activeBottomTab === "Assets" && (
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold">Account Summary</span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: '#00B67A' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#00B67A' }} />Live
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[{ label: "Total Balance", value: "$0.00" }, { label: "Available Balance", value: "$0.00" }, { label: "Equity", value: "$0.00000" }, { label: "Net P&L", value: "$0.00000" }].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeBottomTab === "Positions" && <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No open positions</div>}
              {activeBottomTab === "Orders" && <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No pending orders</div>}
              {activeBottomTab === "History" && <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No trade history</div>}
            </div>
          </div>

          {/* Right Panel - Instruments */}
          <div className={`w-full md:w-64 lg:w-72 xl:w-80 shrink-0 md:border-l border-border flex flex-col h-full overflow-hidden ${mobilePanel === "chart" ? "hidden md:flex" : "flex"}`}>
            <div className="bg-card w-full flex flex-col h-full pb-2">
              {/* Top Toolbar */}
              <article className="bg-card p-2 flex items-center gap-1 border-b border-border relative">
                <section className="flex h-8 min-w-16 bg-muted rounded-md relative z-10 overflow-hidden">
                  <div className="flex items-center cursor-pointer justify-center px-2 rounded-md text-white" style={{ backgroundColor: '#4C72D1' }} title="Instruments">
                    <InstrumentsIcon />
                  </div>
                  <div className="flex items-center cursor-pointer justify-center px-2 rounded-sm text-muted-foreground" title="News & Events">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M2 11.4C2 10.2417 2.24173 10 3.4 10H20.6C21.7583 10 22 10.2417 22 11.4V12.6C22 13.7583 21.7583 14 20.6 14H3.4C2.24173 14 2 13.7583 2 12.6V11.4Z" stroke="currentColor" />
                      <path d="M2 3.4C2 2.24173 2.24173 2 3.4 2H20.6C21.7583 2 22 2.24173 22 3.4V4.6C22 5.75827 21.7583 6 20.6 6H3.4C2.24173 6 2 5.75827 2 4.6V3.4Z" stroke="currentColor" />
                      <path d="M2 19.4C2 18.2417 2.24173 18 3.4 18H20.6C21.7583 18 22 18.2417 22 19.4V20.6C22 21.7583 21.7583 22 20.6 22H3.4C2.24173 22 2 21.7583 2 20.6V19.4Z" stroke="currentColor" />
                    </svg>
                  </div>
                  <aside className="absolute -z-10 top-0 left-0 h-full w-1/2 bg-primary transition-transform duration-300 rounded-md translate-x-0" />
                </section>
                <section className="flex h-8 min-w-8 flex-1 overflow-hidden items-center gap-2 p-2 border rounded-md border-border focus-within:border-foreground duration-300 bg-muted text-sm text-muted-foreground font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground h-4 w-4">
                    <path d="M17.5 17.5L22 22" stroke="currentColor" />
                    <path d="M20 11C20 6.02944 15.9706 2 11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20C15.9706 20 20 15.9706 20 11Z" stroke="currentColor" />
                  </svg>
                  <input className="bg-transparent focus:outline-none flex-1 text-xs font-medium text-foreground" placeholder="Search..." type="text" />
                </section>
                <section className="relative h-8 flex items-center gap-1 p-2 border rounded-md border-border bg-muted cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-4 w-4">
                    <path d="M8.85746 12.5061C6.36901 10.6456 4.59564 8.59915 3.62734 7.44867C3.3276 7.09253 3.22938 6.8319 3.17033 6.3728C2.96811 4.8008 2.86701 4.0148 3.32795 3.5074C3.7889 3 4.60404 3 6.23433 3H17.7657C19.396 3 20.2111 3 20.672 3.5074C21.133 4.0148 21.0319 4.8008 20.8297 6.37281C20.7706 6.83191 20.6724 7.09254 20.3726 7.44867C19.403 8.60062 17.6261 10.6507 15.1326 12.5135C14.907 12.6821 14.7583 12.9567 14.7307 13.2614C14.4837 15.992 14.2559 17.4876 14.1141 18.2442C13.8853 19.4657 12.1532 20.2006 11.226 20.8563C10.6741 21.2466 10.0043 20.782 9.93278 20.1778C9.79643 19.0261 9.53961 16.6864 9.25927 13.2614C9.23409 12.9539 9.08486 12.6761 8.85746 12.5061Z" stroke="currentColor" />
                  </svg>
                </section>
                <section className="group relative h-8 flex items-center p-2 rounded-md bg-muted cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground h-4 w-4">
                    <path d="M13.7276 3.44418L15.4874 6.99288C15.7274 7.48687 16.3673 7.9607 16.9073 8.05143L20.0969 8.58575C22.1367 8.92853 22.6167 10.4206 21.1468 11.8925L18.6671 14.3927C18.2471 14.8161 18.0172 15.6327 18.1471 16.2175L18.8571 19.3125C19.417 21.7623 18.1271 22.71 15.9774 21.4296L12.9877 19.6452C12.4478 19.3226 11.5579 19.3226 11.0079 19.6452L8.01827 21.4296C5.8785 22.71 4.57865 21.7522 5.13859 19.3125L5.84851 16.2175C5.97849 15.6327 5.74852 14.8161 5.32856 14.3927L2.84884 11.8925C1.389 10.4206 1.85895 8.92853 3.89872 8.58575L7.08837 8.05143C7.61831 7.9607 8.25824 7.48687 8.49821 6.99288L10.258 3.44418C11.2179 1.51861 12.7777 1.51861 13.7276 3.44418Z" stroke="currentColor" />
                  </svg>
                </section>
              </article>

              {/* Instruments Content */}
              <div className="flex-1 flex flex-col bg-card overflow-hidden min-h-0">
                <div className="flex items-center h-8 px-3 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors border-b border-border bg-card shrink-0">
                  <Plus className="h-3 w-3" />
                  <span className="text-[10px]">Add watchlist</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="flex items-center h-9 px-2 bg-card cursor-pointer group border-b border-border shrink-0">
                    <div className="flex items-center justify-center w-5 h-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                        <path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9" stroke="currentColor" />
                      </svg>
                    </div>
                    <span className="flex-1 text-sm font-semibold text-foreground">All</span>
                    <span className="text-[10px] text-muted-foreground/60 mr-2 tabular-nums">50</span>
                  </div>
                  <div className="bg-card">
                    <div className="grid grid-cols-4 items-center text-xs text-muted-foreground border-b border-border font-semibold">
                      <div className="h-8 flex items-center pl-4 md:pl-6 col-span-2">
                        <span className="text-muted-foreground/90">Instruments</span>
                      </div>
                      <span className="text-muted-foreground/90 flex items-center h-8">Price</span>
                      <span className="text-muted-foreground/90 flex items-center h-8">Spread</span>
                    </div>
                    {filteredInstruments.slice(0, 8).map((inst) => (
                      <motion.div key={inst.symbol} onClick={() => setSelectedInstrument(inst)}
                        className={`relative group border-b border-border last:border-0 ${selectedInstrument.symbol === inst.symbol ? "bg-primary/10" : ""}`}
                        whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
                        <div className="grid grid-cols-4 items-center h-9 w-full text-xs cursor-pointer relative group bg-card">
                          <div className="flex items-center h-full px-2 pl-4 md:pl-6 overflow-hidden col-span-2">
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center mr-2 text-[8px] shrink-0">
                              {inst.category === "crypto" ? "₿" : inst.category === "forex" ? "$" : inst.category === "commodities" ? "◆" : "📈"}
                            </div>
                            <span className="truncate text-foreground text-[11px] md:text-xs">{inst.symbol}</span>
                          </div>
                          <div className="truncate text-[11px] md:text-xs"><span className="text-foreground">{inst.price}</span></div>
                          <div className="text-muted-foreground text-[11px] md:text-xs">{inst.spread}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Buy / Sell Buttons */}
                <div className="p-3 border-t border-border flex gap-2 shrink-0">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowBookCall(true)}
                    className="flex-1 h-10 rounded-lg font-semibold text-sm text-white" style={{ backgroundColor: "#00B67A" }}>
                    Buy
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowBookCall(true)}
                    className="flex-1 h-10 rounded-lg font-semibold text-sm text-white" style={{ backgroundColor: "hsl(0 70% 50%)" }}>
                    Sell
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookCallDialog open={showBookCall} onClose={() => setShowBookCall(false)} />
    </div>
  );
};

export default TradingInterface;
