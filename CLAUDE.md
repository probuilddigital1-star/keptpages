# KeptPages — Project Memory

## Tech Stack
- **Frontend:** React 18 + Vite, Tailwind CSS, Zustand stores, React Router v6
- **Backend:** Cloudflare Worker (Hono), Supabase (Postgres + Auth), R2 storage, KV rate limiting
- **Testing:** Vitest (frontend + worker), Playwright (E2E), 789+ tests across 70 files
- **Payments:** Stripe (checkout, portal, webhooks), Lulu Print API for book orders
- **AI:** Gemini 2.5 Flash for scan processing

## Key Directories
- `packages/web/` — React frontend (Vite)
- `packages/worker/` — Cloudflare Worker API (Hono)
- `supabase/migrations/` — Database migrations

## Test Commands
- `pnpm -r run test` — Run all tests (frontend + worker)
- `pnpm test:e2e` — Playwright E2E tests

## Architecture Notes
- Zustand stores: `authStore`, `scanStore`, `collectionsStore`, `documentsStore`, `subscriptionStore`, `uiStore`
- API service at `packages/web/src/services/api.js`
- PDF generation: `packages/worker/src/services/pdf.js` (pdf-lib)
- Blueprint book rendering: `packages/worker/src/services/blueprint-pdf.js`
- Design tokens in `tailwind.config.js` (walnut, terracotta, sage, cream palette)

## Responsive Breakpoints (Tailwind)
- Mobile-first design
- `sm:` (640px) — tablet
- `md:` (768px) — small desktop
- `lg:` (1024px) — desktop (sidebar appears, bottom tabs hide)

## Current Status (2026-03-11)
- **87/105 user stories complete**
- Phase 3.5 UX Polish: **20/20 COMPLETE**
- All tests passing (1,416 tests: 789 frontend + 627 worker, 88 files)
- Remaining work: Blog (13 stories), Launch readiness (2), Claude API fallback (1 parked)
