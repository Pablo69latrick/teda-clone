'use client'

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const reviews = [
  { name: "James W.", date: "2 days ago", rating: 5, text: "Incredible platform. Got funded within 24h and the trading conditions are unmatched. No gimmicks, just real capital." },
  { name: "Sophie L.", date: "5 days ago", rating: 5, text: "The education quality is on another level. I went from breakeven to consistently profitable in 3 months." },
  { name: "Marco R.", date: "1 week ago", rating: 4, text: "Best prop firm I've worked with. Fair rules, fast payouts, and the support team actually cares." },
  { name: "Elena K.", date: "2 weeks ago", rating: 5, text: "Finally a platform that treats traders with respect. The mentors are world-class and the community is amazing." },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className="w-3.5 h-3.5"
        fill={i < rating ? "#00B67A" : "transparent"}
        stroke={i < rating ? "#00B67A" : "hsl(var(--muted-foreground))"}
        strokeWidth={1.5}
      />
    ))}
  </div>
);

const TrustpilotCard = () => (
  <div className="flex flex-col rounded-2xl overflow-hidden"
    style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", height: "450px" }}>
    <div className="p-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="w-full bg-white rounded-2xl px-5 py-3 flex items-center justify-between mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/trustpilot-logo.svg" alt="Trustpilot" className="h-5 object-contain" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">4.7</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5" fill="#00B67A" stroke="#00B67A" strokeWidth={1.5} />
            ))}
          </div>
          <span className="text-xs text-gray-500">1,247 reviews</span>
        </div>
      </div>
    </div>
    <div className="flex-1 overflow-hidden relative">
      <motion.div className="flex flex-col"
        animate={{ y: [0, -(reviews.length * 120)] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
        {[...reviews, ...reviews].map((review, i) => (
          <div key={i} className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }}>
                  {review.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground">{review.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{review.date}</span>
            </div>
            <StarRating rating={review.rating} />
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{review.text}</p>
          </div>
        ))}
      </motion.div>
      <div className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10"
        style={{ background: "linear-gradient(to bottom, hsl(var(--card)), transparent)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, hsl(var(--card)), transparent)" }} />
    </div>
  </div>
);

export default TrustpilotCard;
