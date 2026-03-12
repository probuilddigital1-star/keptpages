# KeptPages — Project Memory

## Tech Stack
- **Frontend:** React 18 + Vite, Tailwind CSS, Zustand stores, React Router v6
- **Backend:** Cloudflare Worker (Hono), Supabase (Postgres + Auth), R2 storage, KV rate limiting
- **Testing:** Vitest (frontend + worker), Playwright (E2E), 1,452+ tests across 89 files
- **Payments:** Stripe (checkout, portal, webhooks), Lulu Print API for book orders
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

## Current Status (2026-03-12)
- **105/110 user stories complete**
- "Between the Pages" content hub (BLOG): **12/12 COMPLETE** (US-BLOG-13 skipped)
- Multi-Page Scanning (SCAN): **5/5 COMPLETE**
- Pre-launch checklist (US-QA-10): **COMPLETE**
- All tests passing (1,458 tests: 796 frontend + 662 worker, 90 files)
- Remaining work: Production validation (US-QA-12), Claude API fallback (1 parked)
