# KeptPages — Project Memory

## Tech Stack
- **Frontend:** React 18 + Vite, Tailwind CSS, Zustand stores, React Router v6
- **Backend:** Cloudflare Worker (Hono), Supabase (Postgres + Auth), R2 storage, KV rate limiting
- **Testing:** Vitest (frontend + worker), Playwright (E2E), 1,571+ tests across 91 files
- **Payments:** Stripe (one-time Keeper Pass + book orders), Lulu Print API for book fulfillment
- **AI:** Gemini 2.5 Flash for scan processing, Claude Sonnet fallback

## Key Directories
- `packages/web/` — React frontend (Vite)
- `packages/worker/` — Cloudflare Worker API (Hono)
- `supabase/migrations/` — Database migrations

## Test Commands
- `pnpm -r run test` — Run all tests (frontend + worker)
- `pnpm test:e2e` — Playwright E2E tests

## Architecture Notes
- Zustand stores: `authStore`, `scanStore`, `editorStore`, `collectionsStore`, `documentsStore`, `subscriptionStore`, `uiStore`
- API service at `packages/web/src/services/api.js`
- PDF generation: `packages/worker/src/services/pdf.js` (pdf-lib)
- Blueprint book rendering: `packages/worker/src/services/blueprint-pdf.js`
- Design tokens in `tailwind.config.js` (walnut, terracotta, sage, cream palette)

## Responsive Breakpoints (Tailwind)
- Mobile-first design
- `sm:` (640px) — tablet
- `md:` (768px) — small desktop
- `lg:` (1024px) — desktop (sidebar appears, bottom tabs hide)

## Current Status (2026-03-18)
- **127/131 user stories complete** (LULU epic: 3/3 complete)
- Lulu Print Spec Fixes (LULU): **3/3 DONE** — correct spine width per binding type, cover regeneration at fulfillment
- All prior epics complete (COVER, MOBILE, BLOG, SCAN, QA-10, PRICING, LULU)
- All tests passing (1,571 tests: 832 frontend + 739 worker, 91 files)
- RLS enabled on `public.articles` table (migration 019) — public SELECT for published articles only, writes restricted to service_role
- Remaining work: Production validation (US-QA-12) — final go/no-go before launch

## Pricing Model (2026-03-14)
- **4 customer tiers:** No Account (5 scans), Free (25 scans, 2 collections), Book Purchaser (unlimited scans, 3 collections), Keeper Pass ($59 one-time, unlimited)
- **3 book tiers:** Classic ($39, PB/BW), Premium ($69, CW/FC), Heirloom ($79, CW/FC/80#)
- **3 add-ons:** Glossy cover (free), Coil binding (+$8), Color interior (+$10, Classic only)
- **Discounts:** Multi-copy (15% at 3+, 20% at 5+), Keeper Pass (15% off all books)
- **PDF export gating:** free=blocked, book_purchaser=per-book, keeper=full
- Config source of truth: `packages/web/src/config/plans.js`
