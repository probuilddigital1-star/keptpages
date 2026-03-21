# KeptPages — Project Memory

## Tech Stack
- **Frontend:** React 18 + Vite, Tailwind CSS, Zustand stores, React Router v6
- **Backend:** Cloudflare Worker (Hono), Supabase (Postgres + Auth), R2 storage, KV rate limiting
- **Testing:** Vitest (frontend + worker), Playwright (E2E), 1,698 tests across 100 files
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

## Current Status (2026-03-21)
- **163/167 user stories complete** (ABUSE epic: 6/6 complete)
- Abuse Prevention (ABUSE): **6/6 DONE** — daily cap, file dedup, admin flagging, session enforcement
- All prior epics complete (COVER, MOBILE, BLOG, SCAN, QA-10, PRICING, LULU, ORDER, SHORT, DRAFT, CTA, POLISH, LANDING, ABUSE)
- All tests passing (1,698 tests: 904 frontend + 794 worker, 100 files)
- Remaining work: Production validation (US-QA-12) — final go/no-go before launch

## Pricing Model (2026-03-14)
- **4 customer tiers:** No Account (5 scans), Free (25 scans, 2 collections), Book Purchaser (unlimited scans, 3 collections), Keeper Pass ($59 one-time, unlimited)
- **3 book tiers:** Classic ($39, PB/BW), Premium ($69, CW/FC), Heirloom ($79, CW/FC/80#)
- **3 add-ons:** Glossy cover (free), Coil binding (+$8), Color interior (+$10, Classic only)
- **Discounts:** Multi-copy (15% at 3+, 20% at 5+), Keeper Pass (15% off all books)
- **PDF export gating:** free=blocked, book_purchaser=per-book, keeper=full
- Config source of truth: `packages/web/src/config/plans.js`
