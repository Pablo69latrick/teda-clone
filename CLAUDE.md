# Project: VerticalProp — Prop Trading Platform Clone

## Stack
- Next.js 15 App Router + TypeScript strict
- Tailwind CSS + shadcn/ui (dark trading theme, custom `text-profit`/`text-loss` tokens)
- Supabase (auth + DB + realtime) via `@supabase/ssr`
- SWR for all client data fetching (17 hooks in `src/lib/hooks.ts`)
- lightweight-charts v5.1 for TradingView-style charts
- react-resizable-panels for trading layout
- lucide-react for icons

## Architecture
- All API calls go through `src/app/api/proxy/[...path]/route.ts` — this is the ONLY backend file
- SWR hooks in `src/lib/hooks.ts` — NEVER modify hook signatures or SWR keys
- Types in `src/types/index.ts` — DB uses snake_case, admin endpoints use camelCase
- Supabase clients: `src/lib/supabase/server.ts` (SSR + admin) / `client.ts` (browser Realtime only)
- Auth context: `src/lib/auth-context.tsx` (Supabase auth, not custom)
- Realtime sync: `src/lib/realtime.ts` → invalidates SWR caches on Postgres changes
- Dashboard layout: `src/app/dashboard/layout.tsx` (sidebar + DashboardRealtime)
- Trade page: `src/app/trade/page.tsx` (ResizablePanel layout, keyboard shortcuts F/B/S/Esc)

## Commands
- Dev: `npm run dev`
- Type check: `npx tsc --noEmit`
- Build: `npm run build`
- No test suite configured yet

## Conventions
- snake_case for DB columns and API response fields
- camelCase for TypeScript variables and admin API responses
- Tailwind-only styling, no CSS modules, no inline style objects unless dynamic
- `'use client'` directive on all interactive components
- All timestamps as Unix milliseconds (`number`) in TypeScript types
- `formatCurrency()` and `formatTimestamp()` from `src/lib/utils`
- `cn()` utility for conditional classNames (clsx + twMerge)
- Commit messages: conventional commits (feat/fix/refactor) with scope

## Key Patterns
- Proxy route returns mock data when Supabase is not configured (fallback)
- Price lines on chart via `candleSeries.createPriceLine()` with `LineStyle.Dashed`
- Modals use `createPortal(modal, document.body)` to escape ResizablePanel stacking contexts
- Order buttons have `data-action="long"` / `data-action="short"` for keyboard shortcut targeting

## Forbidden
- Do NOT modify `src/lib/hooks.ts` hook signatures or SWR key patterns
- Do NOT modify `src/types/index.ts` type shapes without updating the proxy route to match
- Do NOT read `node_modules/`, `.next/`, `.git/`, `coverage/`
- Do NOT modify `.env.local` or any `.env*` files
