'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Send } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
];

interface Props { open: boolean; onClose: () => void; }

const BookCallDialog = ({ open, onClose }: Props) => {
  const [form, setForm] = useState({ firstName: "", email: "", countryCode: "+1", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const filtered = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await fetch("https://noewzreurtigsqdlgoas.supabase.co/functions/v1/native-form-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, phone: `${form.countryCode} ${form.phone}` }),
    }).catch(() => {});
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 2500);
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === form.countryCode) ?? COUNTRY_CODES[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div>
                <h2 className="text-base font-semibold">Request Access</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Our team will contact you within 24h</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,182,122,0.12)' }}>
                  <Send className="w-5 h-5" style={{ color: '#00B67A' }} />
                </div>
                <p className="font-semibold">Request sent!</p>
                <p className="text-sm text-muted-foreground mt-1">We&apos;ll be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">First Name</label>
                  <input required maxLength={50} value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border/50 bg-muted/30 focus:outline-none focus:border-foreground/40 transition-colors"
                    placeholder="Your first name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
                  <input required type="email" maxLength={255} value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border/50 bg-muted/30 focus:outline-none focus:border-foreground/40 transition-colors"
                    placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone</label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button type="button" onClick={() => setCountryOpen(o => !o)}
                        className="h-full px-3 rounded-lg border border-border/50 bg-muted/30 flex items-center gap-1.5 text-sm min-w-[90px]">
                        <span>{selectedCountry.flag}</span>
                        <span className="font-mono text-xs">{selectedCountry.code}</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                      {countryOpen && (
                        <div className="absolute top-full mt-1 left-0 w-56 rounded-xl border border-border/50 bg-card shadow-xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-border/30">
                            <input autoFocus value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-muted/30 rounded-lg border border-border/50 focus:outline-none"
                              placeholder="Search country..." />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filtered.map(c => (
                              <button key={c.code} type="button" onClick={() => { setForm(f => ({ ...f, countryCode: c.code })); setCountryOpen(false); setCountrySearch(""); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left">
                                <span>{c.flag}</span>
                                <span className="flex-1">{c.name}</span>
                                <span className="font-mono text-muted-foreground">{c.code}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                      className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-border/50 bg-muted/30 focus:outline-none focus:border-foreground/40 transition-colors"
                      placeholder="Phone number" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message <span className="opacity-50">(optional)</span></label>
                  <textarea maxLength={1000} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border/50 bg-muted/30 focus:outline-none focus:border-foreground/40 transition-colors resize-none"
                    placeholder="Tell us about your trading experience..." />
                </div>
                <motion.button type="submit" disabled={sending}
                  className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1"
                  style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
                  whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }}>
                  {sending ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <>Request Access <Send className="w-3.5 h-3.5" /></>}
                </motion.button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookCallDialog;
