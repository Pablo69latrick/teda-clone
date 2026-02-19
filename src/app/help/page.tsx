'use client'

import { useState } from 'react'
import { Search, ChevronRight, ChevronDown, BookOpen, Target, DollarSign, ShieldCheck, BarChart2, HelpCircle, TrendingUp, Zap, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Article {
  id: string
  title: string
  excerpt: string
  readTime: string
  category: string
}

interface Category {
  id: string
  icon: React.ElementType
  label: string
  color: string
  articles: Article[]
}

interface FAQ {
  q: string
  a: string
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    icon: Zap,
    label: 'Getting Started',
    color: 'text-blue-400',
    articles: [
      { id: 'gs-1', title: 'How to purchase a challenge',         excerpt: 'Step-by-step guide to selecting and buying your first prop firm challenge account.', readTime: '3 min', category: 'getting-started' },
      { id: 'gs-2', title: 'Setting up your MetaTrader account',  excerpt: 'Connect your MT4/MT5 credentials to start trading your funded account.', readTime: '4 min', category: 'getting-started' },
      { id: 'gs-3', title: 'Platform walkthrough',                excerpt: 'A full tour of the dashboard, terminal, analytics, and account tools.', readTime: '6 min', category: 'getting-started' },
      { id: 'gs-4', title: 'Your first trade',                    excerpt: 'How to place, manage, and close your first position on the trading terminal.', readTime: '5 min', category: 'getting-started' },
    ],
  },
  {
    id: 'challenges',
    icon: Target,
    label: 'Challenge Rules',
    color: 'text-yellow-400',
    articles: [
      { id: 'ch-1', title: 'Understanding the profit target',     excerpt: "What counts toward your profit target and how it's calculated.", readTime: '4 min', category: 'challenges' },
      { id: 'ch-2', title: 'Maximum drawdown explained',          excerpt: 'How max drawdown is calculated — balance-based vs equity-based rules.', readTime: '5 min', category: 'challenges' },
      { id: 'ch-3', title: 'Daily loss limit rules',              excerpt: 'How the daily loss limit resets, what triggers it, and how to avoid violations.', readTime: '4 min', category: 'challenges' },
      { id: 'ch-4', title: 'Minimum trading days',                excerpt: 'Why minimum trading days exist and how to satisfy the requirement.', readTime: '3 min', category: 'challenges' },
      { id: 'ch-5', title: 'Prohibited trading activities',       excerpt: 'A comprehensive list of strategies and behaviors that violate our rules.', readTime: '6 min', category: 'challenges' },
      { id: 'ch-6', title: 'Multi-phase vs instant funding',      excerpt: 'Compare our 1-phase and 2-phase evaluation options.', readTime: '4 min', category: 'challenges' },
    ],
  },
  {
    id: 'payouts',
    icon: DollarSign,
    label: 'Payouts & Billing',
    color: 'text-profit',
    articles: [
      { id: 'pay-1', title: 'How to request a payout',           excerpt: 'Submit a payout request from your dashboard and track its status.', readTime: '3 min', category: 'payouts' },
      { id: 'pay-2', title: 'Payout schedule and processing time', excerpt: 'When payouts are processed and how long they take to arrive.', readTime: '3 min', category: 'payouts' },
      { id: 'pay-3', title: 'Supported payout methods',           excerpt: 'Bank wire, crypto, and other payment methods we support.', readTime: '2 min', category: 'payouts' },
      { id: 'pay-4', title: 'Profit split explained',             excerpt: 'How the 80/85% profit split works and how your share is calculated.', readTime: '4 min', category: 'payouts' },
      { id: 'pay-5', title: 'Refund policy',                      excerpt: 'When you\'re eligible for a refund on your challenge fee.', readTime: '3 min', category: 'payouts' },
    ],
  },
  {
    id: 'funded',
    icon: ShieldCheck,
    label: 'Funded Accounts',
    color: 'text-primary',
    articles: [
      { id: 'f-1', title: 'What happens after you pass',          excerpt: 'The steps from passing your evaluation to receiving live funded capital.', readTime: '4 min', category: 'funded' },
      { id: 'f-2', title: 'Scaling plan overview',               excerpt: 'How to grow your funded account size up to $2M through consistent performance.', readTime: '5 min', category: 'funded' },
      { id: 'f-3', title: 'Funded account rules',                 excerpt: 'Rules that apply specifically to live funded accounts (different from evaluation).', readTime: '5 min', category: 'funded' },
      { id: 'f-4', title: 'Account reset process',               excerpt: 'How to request an account reset and when it is available.', readTime: '3 min', category: 'funded' },
    ],
  },
  {
    id: 'trading',
    icon: BarChart2,
    label: 'Trading & Tools',
    color: 'text-chart-2',
    articles: [
      { id: 't-1', title: 'Supported instruments and symbols',    excerpt: 'All available forex pairs, indices, and commodities on the platform.', readTime: '3 min', category: 'trading' },
      { id: 't-2', title: 'Leverage and margin requirements',     excerpt: 'How leverage works, margin levels, and when margin calls occur.', readTime: '5 min', category: 'trading' },
      { id: 't-3', title: 'Reading the analytics dashboard',      excerpt: 'How to interpret your trading stats, win rate, and drawdown metrics.', readTime: '4 min', category: 'trading' },
      { id: 't-4', title: 'Using the economic calendar',          excerpt: 'How to use the built-in economic calendar to plan around news events.', readTime: '3 min', category: 'trading' },
      { id: 't-5', title: 'Overnight and weekend holding',        excerpt: 'Rules around holding positions through market close and weekends.', readTime: '4 min', category: 'trading' },
    ],
  },
  {
    id: 'account',
    icon: HelpCircle,
    label: 'Account & Security',
    color: 'text-muted-foreground',
    articles: [
      { id: 'ac-1', title: 'Changing your password',              excerpt: 'How to update your login credentials from your account settings.', readTime: '2 min', category: 'account' },
      { id: 'ac-2', title: 'Enabling two-factor authentication',  excerpt: 'Set up 2FA with an authenticator app for extra account security.', readTime: '3 min', category: 'account' },
      { id: 'ac-3', title: 'KYC verification process',            excerpt: 'What documents you need to submit and how long verification takes.', readTime: '4 min', category: 'account' },
      { id: 'ac-4', title: 'Managing notification preferences',   excerpt: 'Control which emails and alerts you receive from VerticalProp.', readTime: '2 min', category: 'account' },
    ],
  },
]

const FAQS: FAQ[] = [
  { q: 'How long do I have to complete the challenge?',        a: 'You have 30 calendar days to meet the profit target on a 2-phase challenge, and 60 days on a 1-phase. There is no time limit on funded accounts.' },
  { q: 'Can I use an EA or trading bot?',                       a: 'Yes, automated trading strategies are allowed as long as they don\'t exploit our infrastructure (latency arbitrage, HFT). EAs must follow all standard challenge rules.' },
  { q: 'What happens if I breach my account?',                  a: 'A breach immediately disables trading and closes all open positions. Challenge accounts are closed and are not eligible for a refund. You can purchase a new challenge at any time.' },
  { q: 'Is news trading allowed?',                              a: 'Yes, news trading is permitted. However, holding positions through major news events on funded accounts carries higher risk and may be subject to increased monitoring.' },
  { q: 'Can I hold trades over the weekend?',                   a: 'Yes, you can hold positions over the weekend. Note that gap risk applies and the daily loss limit does not reset over the weekend.' },
  { q: 'How many accounts can I have?',                         a: 'You can hold multiple challenge and funded accounts simultaneously. Each account is evaluated independently.' },
  { q: 'When do I get my profit split?',                        a: 'Payouts are processed within 1–3 business days of approval. The minimum payout is $100, and you can request a payout once every 14 days on funded accounts.' },
  { q: 'Do you offer a free trial or demo?',                    a: 'We don\'t offer free trials, but all challenge accounts start with full access to the dashboard and terminal immediately upon purchase.' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  return (
    <button className="w-full text-left flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
          {article.title}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{article.excerpt}</div>
        <div className="text-[10px] text-muted-foreground/60 mt-1">{article.readTime} read</div>
      </div>
      <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-1 transition-colors" />
    </button>
  )
}

function CategorySection({ category, isOpen, onToggle, searchQ }: {
  category: Category
  isOpen: boolean
  onToggle: () => void
  searchQ: string
}) {
  const filtered = searchQ
    ? category.articles.filter(a =>
        a.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(searchQ.toLowerCase())
      )
    : category.articles

  if (searchQ && filtered.length === 0) return null

  const Icon = category.icon

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('size-4', category.color)} />
          <span className="font-semibold text-sm">{category.label}</span>
          <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
            {filtered.length} articles
          </span>
        </div>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>
      {(isOpen || searchQ) && (
        <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-0.5 border-t border-border/30">
          {filtered.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}

function FAQItem({ faq, isOpen, onToggle }: { faq: FAQ; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 py-4 text-left hover:text-primary transition-colors group"
      >
        <span className="text-sm font-medium leading-snug">{faq.q}</span>
        <ChevronDown className={cn(
          'size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform',
          isOpen && 'rotate-180 text-primary'
        )} />
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {faq.a}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['getting-started']))
  const [openFAQs, setOpenFAQs] = useState<Set<number>>(new Set())

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleFAQ = (idx: number) => {
    setOpenFAQs(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const allArticles = CATEGORIES.flatMap(c => c.articles)
  const searchResults = search
    ? allArticles.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(search.toLowerCase())
      )
    : []

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="flex justify-center mb-3">
          <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="size-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Help Center & Academy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you need to know about trading with VerticalProp
        </p>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto w-full">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles, rules, and guides..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border/50 rounded-xl focus:outline-none focus:border-primary/60 focus:bg-card text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </div>
      </div>

      {/* Search results */}
      {search && (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground mb-1 font-medium">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{search}&quot;
          </div>
          {searchResults.length === 0 ? (
            <div className="rounded-xl bg-card border border-border/50 py-10 text-center">
              <HelpCircle className="size-7 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No articles found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try different keywords or browse categories below</p>
            </div>
          ) : (
            <div className="rounded-xl bg-card border border-border/50 divide-y divide-border/30">
              {searchResults.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      {!search && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setOpenCategories(prev => new Set([...prev, cat.id]))
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:bg-muted/10 transition-all group"
              >
                <div className={cn('size-8 rounded-lg flex items-center justify-center bg-muted/30 group-hover:bg-muted/50 transition-colors', cat.color)}>
                  <Icon className="size-4" />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">{cat.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Category sections */}
      <div className="flex flex-col gap-3">
        {!search && <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Browse Topics</h2>}
        {CATEGORIES.map(cat => (
          <div id={`cat-${cat.id}`} key={cat.id}>
            <CategorySection
              category={cat}
              isOpen={openCategories.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
              searchQ={search}
            />
          </div>
        ))}
      </div>

      {/* FAQ */}
      {!search && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Frequently Asked Questions
          </h2>
          <div className="rounded-xl bg-card border border-border/50 px-5">
            {FAQS.map((faq, idx) => (
              <FAQItem
                key={idx}
                faq={faq}
                isOpen={openFAQs.has(idx)}
                onToggle={() => toggleFAQ(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contact support */}
      {!search && (
        <div className="rounded-xl bg-card border border-border/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Still need help?</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Our support team is available Monday–Friday, 9am–6pm UTC.
            We typically respond within a few hours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-border transition-all text-left group">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="size-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Live Chat</div>
                <div className="text-[10px] text-muted-foreground">Available now</div>
              </div>
              <ExternalLink className="size-3.5 text-muted-foreground/40 group-hover:text-primary ml-auto transition-colors" />
            </button>

            <button className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-border transition-all text-left group">
              <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Mail className="size-4 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Email Support</div>
                <div className="text-[10px] text-muted-foreground">support@verticalprop.com</div>
              </div>
              <ExternalLink className="size-3.5 text-muted-foreground/40 group-hover:text-blue-400 ml-auto transition-colors" />
            </button>

            <button className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-border transition-all text-left group">
              <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="size-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Discord Community</div>
                <div className="text-[10px] text-muted-foreground">1,800+ traders</div>
              </div>
              <ExternalLink className="size-3.5 text-muted-foreground/40 group-hover:text-indigo-400 ml-auto transition-colors" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
