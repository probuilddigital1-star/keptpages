# KeptPages — User Stories

Generated: 2026-03-01
Last Updated: 2026-03-10
Branch: `feature/cta-and-blog`
Repo: https://github.com/probuilddigital1-star/keptpages

---

## Progress Tracker

| Story | Title | Status | Notes |
|-------|-------|--------|-------|
| US-INFRA-1 | Supabase project + schema | DONE | 4 migrations pushed, 11 tables, auth trigger verified, ES256 JWT fix applied to worker auth middleware |
| US-INFRA-2 | R2 buckets | DONE | `keptpages-uploads` + `keptpages-processed` created in Cloudflare |
| US-INFRA-3 | KV namespace | DONE | `RATE_LIMIT` namespace created, wrangler.toml updated with ID `b869a2860f7346ef8069e5948bb29fa9` |
| US-INFRA-4 | Workers deployment + domain | DONE | Worker at api.keptpages.com, Pages at app.keptpages.com + keptpages.com, 4 secrets set, CI/CD workflows ready |
| US-INFRA-5 | Main branch + git workflow | DONE | `main` + `feature/cta-and-blog` pushed to GitHub |
| US-INFRA-6 | DNS and domain routing | DONE | api/app/www CNAME records, root CNAME to pages.dev, Worker custom domain, SSL pending auto-issue |
| US-INFRA-7 | GitHub Actions secrets | DONE | 6 secrets set: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD |
| US-INFRA-8 | Local dev environment | DONE | Worker + frontend both start clean, wrangler v4 upgraded |
| US-INFRA-9 | Supabase storage buckets | SKIP | Using R2 for all file storage instead of Supabase Storage |
| US-BLOG-1 | Blog DB schema | TODO | |
| US-BLOG-2 | Blog migration | TODO | |
| US-BLOG-3 | Blog public API | TODO | |
| US-BLOG-4 | Blog admin API | TODO | |
| US-BLOG-5 | Blog listing page | TODO | |
| US-BLOG-6 | Blog navigation | TODO | |
| US-BLOG-7 | Blog post detail | TODO | |
| US-BLOG-8 | Blog SEO | TODO | |
| US-BLOG-9 | Blog CTA components | TODO | |
| US-BLOG-10 | Blog content strategy | TODO | |
| US-BLOG-11 | Blog routes | TODO | |
| US-BLOG-12 | Blog RSS feed | TODO | |
| US-BLOG-13 | Blog admin UI | TODO | |
| US-PAY-1 | Stripe account | DONE | Stripe account created + API keys configured in env |
| US-PAY-2 | Stripe products/prices | DONE | Products/prices created in Stripe Dashboard |
| US-PAY-3 | Stripe public key | DONE | `@stripe/stripe-js` installed, `getStripe()` singleton, `config.stripePublicKey` wired |
| US-PAY-4 | Stripe webhook | DONE | Webhook registered in Stripe Dashboard, signing secret configured |
| US-PAY-5 | Checkout flow E2E | DONE | Full checkout flow: checkout session, redirect, success/cancel pages, webhook activation |
| US-PAY-6 | Webhook lifecycle | DONE | Handles checkout.completed, sub.updated, sub.deleted, invoice.succeeded, invoice.failed |
| US-PAY-7 | Customer portal | DONE | POST /stripe/portal endpoint, Settings page "Manage Subscription" button |
| US-PAY-8 | Lulu Print API | DONE | Sandbox credentials configured, signed R2 URLs |
| US-PAY-9 | Book pricing/checkout | DONE | Book orders go through Stripe, webhook triggers Lulu fulfillment, dynamic pricing |
| US-PAY-10 | Subscription sync | DONE | Migration 009 adds stripe columns, webhook-driven sync, profile-based tier derivation |
| US-PAY-11 | Print options config & UI selectors | DONE | PRINT_OPTIONS constant, OrderPanel radio selectors, live price updates |
| US-PAY-12 | Print options backend & database | DONE | Migration 012, validation, Stripe metadata, print_options JSONB column |
| US-PAY-13 | Dynamic Lulu package ID & pricing fix | DONE | buildPodPackageId(), unified $79 base pricing, 8 new tests |
| US-PAY-14 | Customer order status display | DONE | OrderStatusPanel with status stepper, tracking links, order details. OrderPanel auto-delegates for post-order books. |
| US-PAY-15 | Admin order dashboard | DONE | Admin middleware (ADMIN_EMAILS env), GET /admin/orders with pagination/filter, admin nav link, AdminOrders page. |
| US-PAY-16 | Dev mock status endpoint | DONE | POST /admin/orders/:id/mock-status (blocked in production), mock tracking data, dev-only UI controls. |
| US-CORE-1 | Fix waitlist migration | DONE | Added missing columns in migration 002 |
| US-CORE-2 | Auth providers | DONE | Google OAuth configured in Supabase + Google Cloud |
| US-CORE-3 | Wire real Supabase client | DONE | `.env` configured, `isSupabaseConfigured=true`, build passes |
| US-CORE-4 | Auth flow E2E testing | DONE | Signup/confirm/login verified, ES256 JWT accepted by worker, wrangler upgraded to v4 |
| US-CORE-5 | Wire Gemini API | DONE | Gemini 2.5 Flash configured, model updated from retired 2.0 Flash |
| US-CORE-6 | Wire Claude API | TODO | |
| US-CORE-7 | Add to Collection flow | DONE | CollectionPickerModal built, wired into ScanDetail, worker endpoints added |
| US-CORE-8 | Add Document flow | DONE | DocumentPickerModal built, wired into Collection page, multi-select support |
| US-CORE-9 | Scan flow E2E | DONE | Upload, process (Gemini), list, get — all verified. Migration 007 fixed scan_status enum. |
| US-CORE-10 | Collection PDF export | DONE | pdf-lib generates PDF, stored in R2, download endpoint verified |
| US-CORE-11 | Sharing flow | DONE | Migration 008 created shares table. POST/GET/DELETE share endpoints + public viewer. Frontend Shared page wired. |
| US-CORE-12 | R2 upload flow | DONE | Upload stores in R2 via worker, verified in E2E test |
| US-CORE-13 | Settings page wiring | DONE | User routes: GET/PUT profile, POST avatar, POST export, DELETE account. All tested. |
| US-EXPORT-1 | Fix PDF TOC + content overflow | DONE | Two-pass rendering: docs first, then insert front matter with correct page numbers. Content overflow adds continuation pages. |
| US-EXPORT-2 | PDF service export options | DONE | Options: template, fontFamily (serif/sans-serif/monospace), includeTitlePage/Copyright/Toc, showPageNumbers. Backward-compatible. 13 new tests. |
| US-EXPORT-3 | API export options endpoint | DONE | POST /collections/:id/export accepts options body + documentIds filter/reorder. Empty body = defaults. |
| US-EXPORT-4 | Export Options Modal | DONE | ExportOptionsModal component: template radio cards, font dropdown, section toggles, doc checklist with reorder. |
| US-EXPORT-5 | Tier-gated export flow | DONE | Keeper → ExportOptionsModal → API with options. Free → direct export with defaults. |
| US-EXPORT-6 | Marketing messaging update | DONE | FREE: 'Basic PDF export'. KEEPER: 'Custom PDF export' added to feature lists. |
| US-EXPORT-7 | Color theme templates | DONE | 5 templates (heritage, garden, heirloom, parchment, modern) with coordinated color palettes |
| US-EXPORT-8 | Decorative page graphics | DONE | Page borders (single/double/none), corner ornaments, section dividers (diamond/dots/line), title decoration |
| US-EXPORT-9 | Embed original scan images | DONE | includeOriginalScans option, scan images rendered as full-page with caption before document text |
| US-QA-1 | Unit test suite | DONE | 538 tests (128 worker + 410 frontend), 44 test files, all passing. Fixed 41 stale test assertions. |
| US-QA-2 | Integration tests | DONE | 46 integration tests covering scan, collections, share, books routes. Queue-based Supabase mock. |
| US-QA-3 | E2E tests | DONE | 32 Playwright tests (7 specs), 2 bug fixes (Scan fetchSubscription, Collection spinner), boundary/error/equivalence testing |
| US-QA-4 | Error monitoring | DONE | ErrorBoundary component, captureError/captureMessage utility. Sentry-ready (install @sentry/react + set DSN to activate). |
| US-QA-5 | Analytics | DONE | trackPageView/trackEvent utility, usePageTracking hook wired into App. Plausible-compatible (set VITE_ANALYTICS_ID to activate). |
| US-QA-6 | Performance audit | DONE | Non-blocking font loading (preload + media swap), Stripe in separate chunk, manual chunks for vendor/supabase/stripe. |
| US-QA-7 | Accessibility audit | DONE | Modal focus trap, Input aria-describedby + aria-invalid, skip-to-content link, main landmark ID. |
| US-QA-8 | Mobile QA | DONE | Fixed: Modal scroll overflow, touch targets (44px min), CollectionCard hover-only delete, delete button visibility |
| US-QA-9 | Security review | DONE | Fixed: path traversal in R2 downloads, JWKS stale-fallback, avatar_url validation. Noted: shares RLS policy, waitlist rate limit, MIME sniffing |
| US-QA-10 | Pre-launch checklist | TODO | |
| US-QA-11 | Clean up artifacts | DONE | Moved static HTML landing pages + duplicate design system to docs/archive/ |
| US-QA-12 | Production validation | TODO | |
| US-BOOK-1 | Book designer shell & page navigation | DONE | BookDesigner replaces 4-step wizard, 2-column layout, sortable page list, GlobalSettingsPanel, migration 011 |
| US-BOOK-2 | Konva canvas page renderer | DONE | PageCanvas with Konva Stage 850x1100, background/content layers, PageBackground with textures, PageThumbnail |
| US-BOOK-3 | Interactive element editing (drag/resize) | DONE | Transformer handles, drag/resize with normalized coords, element selection, AddElementPanel |
| US-BOOK-4 | Inline text editing & text styles | DONE | TextEditOverlay on double-click, font/size/weight/style/color/alignment controls, 4 text presets |
| US-BOOK-5 | All page types (7 kinds) | DONE | document, custom-text, photo, photo-collage, section-divider, dedication, blank — each with default elements |
| US-BOOK-6 | Image library & additional photo upload | DONE | ImageLibraryPanel, POST/DELETE /books/:id/images endpoints, R2 storage, max 50 images |
| US-BOOK-7 | Page backgrounds & photo frames | DONE | 5 textures (linen, paper-grain, watercolor-wash, parchment, none), 6 frame styles, PageSettingsPanel |
| US-BOOK-8 | Enhanced cover designer | DONE | CoverDesignerPanel with 3 layouts (centered, left-aligned, photo-background), live preview |
| US-BOOK-9 | Custom font embedding in PDFs | DONE | fonts.js service, KV-based font loading, StandardFonts fallback, 4 font families |
| US-BOOK-10 | Blueprint-driven PDF generation engine | DONE | renderBlueprintBook(), coordinate translation, text/image/shape/decorative renderers, texture backgrounds, photo frames, front matter, 11 tests |
| US-BOOK-11 | Order panel & book ordering | DONE | OrderPanel with generate/download, shipping form, quantity, pricing, Stripe checkout integration |
| US-BOOK-12 | Auto-save, undo/redo & keyboard shortcuts | DONE | zundo temporal middleware, Ctrl+Z/Shift+Z, Delete/arrow nudge, 5s auto-save, save status indicator |
| US-BOOK-13 | Testing & production polish | DONE | 11 blueprint PDF tests, hexToRgb 3-char fix, responsive sidebar, 642 total tests passing, clean build |
| US-UX-1 | Toast notifications mobile positioning | DONE | Toasts clear bottom nav on mobile (`bottom-20 lg:bottom-6`), full-width on small screens |
| US-UX-2 | Collection action buttons mobile layout | TODO | 5 buttons overflow/wrap awkwardly on narrow screens |
| US-UX-3 | Document card mobile action layout | TODO | Reorder buttons stack tall, making cards oversized on mobile |
| US-UX-4 | Camera controls safe-area padding | DONE | Added `pb-[calc(1.5rem+env(safe-area-inset-bottom))]` to camera controls |
| US-UX-5 | Export modal state persistence | DONE | Removed resetState from close handler, only resets after successful export |
| US-UX-6 | DropZone mobile optimization | TODO | Oversized padding + irrelevant drag text on mobile |
| US-UX-7 | Document removal confirmation | DONE | Confirmation modal before removing document from collection |
| US-UX-8 | Scan page header responsive layout | TODO | Heading and badge overlap on <360px screens |
| US-UX-9 | Error toast auto-dismiss timing | DONE | Variant-based timing: success 4s, info 5s, error 7s |
| US-UX-10 | TopBar dropdown overflow guard | TODO | 176px menu clips off-screen on narrow phones |
| US-UX-11 | Loading skeleton placeholders | TODO | Spinner-only loading feels broken, no skeleton states |
| US-UX-12 | Collection name edit discoverability | TODO | No visual cue name is tappable on mobile (hover-only) |
| US-UX-13 | Upload photo card click handler | TODO | Card does nothing when not at scan limit |
| US-UX-14 | Back-to-collection after scanning | TODO | No obvious return path after scanning from collection |
| US-UX-15 | Delete collection soft-delete | TODO | Permanent deletion with no undo or recovery option |
| US-UX-16 | Toast container mobile width | DONE | Full-width on mobile with padding, 320px on desktop (combined with UX-1) |
| US-UX-17 | Export modal reorder tap targets | DONE | Increased to `p-2.5` with 44px min touch targets |
| US-UX-18 | Signup password strength indicator | TODO | No minimum length or strength feedback on signup |
| US-UX-19 | Avatar upload progress indicator | TODO | No spinner/progress during avatar upload |
| US-UX-20 | Upgrade link deep-linking | TODO | Mobile upgrade pill goes to Settings, user must scroll to find card |

**Completed: 74/105** | **Remaining: 31**

### Prioritized Roadmap (as of 2026-03-07)

**DONE — Phases 1–3, 5.5, 6:** Export, QA, Book Designer, Print Options, Order Tracking & Admin
**Phase 3.5 — UX Polish (NEW):** US-UX-1→20 (mobile/desktop friction fixes)
**Phase 4 — Content & Growth:** US-BLOG-1→13 (blog infrastructure + content)
**Phase 5 — Launch Readiness:** US-QA-10→12 (pre-launch)
**Parked:** US-CORE-6 (Claude API fallback — optional)

### Key Credentials & Resources (do not commit)
- **Supabase project:** `jvvcbekzmsnziulpewwh` (https://jvvcbekzmsnziulpewwh.supabase.co)
- **Cloudflare account:** `e63d3b40b8b4cfaf24feab115bb9ae19`
- **Google OAuth Client ID:** `726272809014-1m2crhaddj5elte2tockoa3k7e775r7l.apps.googleusercontent.com`
- **Frontend env:** `packages/web/.env` (gitignored)
- **Worker env:** `packages/worker/.dev.vars` (gitignored)
- **Worker uses legacy service_role JWT** (not sb_secret_ format) for Supabase client
- **Auth middleware updated** to support ES256 JWTs (JWKS-based verification)

### Key Fixes Applied
- `supabase/config.toml`: removed `[project]` section, updated `major_version` to 17, enabled Google OAuth, added production redirect URLs
- `packages/worker/src/middleware/auth.js`: rewritten to support ES256 (new Supabase) + HS256 (legacy) JWT verification via JWKS
- `packages/worker/.dev.vars`: uses legacy service_role JWT instead of sb_secret_ key
- Migrations 002-008 added: grants, waitlist columns, anon policy fix, PostgREST schema reload, scan_id FK, worker columns, status enum, shares table
- Supabase auth redirect URLs updated for production (site_url → keptpages.com, allowed all production domains)
- Landing page CTAs converted from waitlist form to signup navigation
- `isFreeTier` fixed to query correct `tier` column (was querying non-existent columns)
- 10 frontend-API integration bugs fixed (upload field name, response shape mismatches, cross-origin URLs)

---

## Summary

| Epic | Stories | Completed | Remaining |
|------|---------|-----------|-----------|
| **INFRA** — Infrastructure & DevOps | 9 | 8 | 0 (+1 skipped) |
| **BLOG** — Blog Feature | 13 | 0 | 13 |
| **PAY** — Payments & Subscriptions | 16 | 16 | 0 |
| **CORE** — Auth, API Wiring & Features | 13 | 12 | 1 |
| **EXPORT** — PDF Export Customization | 9 | 9 | 0 |
| **QA** — Testing & Launch Readiness | 12 | 9 | 3 |
| **BOOK** — Visual Book Designer | 13 | 13 | 0 |
| **UX** — Mobile & Desktop Friction Fixes | 20 | 7 | 13 |
| **Total** | **105** | **74** | **31** |

---

## Epic 1: Infrastructure & DevOps (INFRA)

### US-INFRA-1: Create and configure Supabase project ✅ DONE
**As a** developer
**I want to** provision a Supabase project for KeptPages and run the initial schema migration
**So that** the backend has a working Postgres database with auth, RLS policies, and all tables needed by the application

**Acceptance Criteria:**
- [ ] A new Supabase project is created and the project ref ID is recorded
- [ ] `supabase link --project-ref <ref>` succeeds from the repo root
- [ ] `supabase db push` applies `supabase/migrations/001_initial_schema.sql` without errors, creating all 11 tables (`profiles`, `subscriptions`, `waitlist`, `scans`, `documents`, `scan_documents`, `collections`, `collection_items`, `books`, `family_shares`, `share_invites`)
- [ ] All 5 custom enums exist in the database (`document_type`, `scan_status`, `book_status`, `subscription_tier`, `share_permission`)
- [ ] All 6 functions exist and are callable (`update_updated_at`, `handle_new_user`, `update_scan_count`, `update_collection_count`, `can_create_scan`, `can_create_collection`)
- [ ] The `on_auth_user_created` trigger fires on `auth.users` INSERT and auto-creates a row in `profiles`
- [ ] RLS is enabled on all 11 tables and all 30+ policies from the migration are active
- [ ] All indexes (14 total including GIN indexes for tags and full-text search) are created
- [ ] Email auth provider is enabled with signup enabled
- [ ] Google OAuth provider is enabled and configured with client ID/secret
- [ ] The project's `anon` key, `service_role` key, JWT secret, and project URL are documented in a secure location (not committed to repo)

**Dependencies:** None
**Estimate:** M

---

### US-INFRA-2: Set up Cloudflare R2 buckets ✅ DONE
**As a** developer
**I want to** provision the two R2 storage buckets referenced in `wrangler.toml`
**So that** the Worker can store uploaded scan images and processed AI extraction results

**Acceptance Criteria:**
- [ ] R2 bucket `keptpages-uploads` is created in the Cloudflare account (binding: `UPLOADS`)
- [ ] R2 bucket `keptpages-processed` is created in the Cloudflare account (binding: `PROCESSED`)
- [ ] Both buckets are accessible from the Worker using the bindings in `packages/worker/wrangler.toml`
- [ ] A CORS policy is configured on `keptpages-uploads` to allow PUT requests from `https://app.keptpages.com` and `http://localhost:3000`
- [ ] `wrangler r2 bucket list` shows both buckets
- [ ] Running `pnpm --filter @keptpages/worker dev` does not produce R2 binding errors

**Dependencies:** Cloudflare account access
**Estimate:** S

---

### US-INFRA-3: Set up Cloudflare KV namespace for rate limiting ✅ DONE
**As a** developer
**I want to** create a KV namespace and replace the `placeholder-id` in `wrangler.toml`
**So that** the Worker's rate-limiting middleware has a functioning key-value store

**Acceptance Criteria:**
- [ ] A KV namespace is created via `wrangler kv namespace create RATE_LIMIT`
- [ ] The `id` field in `packages/worker/wrangler.toml` line 18 is updated from `"placeholder-id"` to the actual KV namespace ID
- [ ] A preview KV namespace is created for local development and the `preview_id` is added to `wrangler.toml`
- [ ] `pnpm --filter @keptpages/worker dev` starts without KV binding warnings
- [ ] `pnpm --filter @keptpages/worker build` (dry-run deploy) succeeds without KV errors

**Dependencies:** Cloudflare account access
**Estimate:** S

---

### US-INFRA-4: Configure Cloudflare Workers deployment and custom domain
**As a** developer
**I want to** deploy the Hono Worker to Cloudflare and bind it to `api.keptpages.com`
**So that** the frontend can make API calls to a production endpoint

**Acceptance Criteria:**
- [ ] `pnpm --filter @keptpages/worker deploy` succeeds and the Worker is live on Cloudflare
- [ ] A custom route or Worker custom domain is configured so `api.keptpages.com/*` routes to the `keptpages-api` Worker
- [ ] The Worker's production secrets are set via `wrangler secret put` for all 9 variables in `.dev.vars.example`
- [ ] The deployed Worker responds to `GET https://api.keptpages.com/api/health` with a 200 status
- [ ] CORS headers allow requests from `https://app.keptpages.com` and `https://keptpages.com`
- [ ] A Cloudflare Pages project named `keptpages-web` is created for frontend hosting

**Dependencies:** US-INFRA-1, US-INFRA-2, US-INFRA-3, US-INFRA-6
**Estimate:** M

---

### US-INFRA-5: Create `main` branch and establish git workflow ✅ DONE
**As a** developer
**I want to** create a protected `main` branch and define the branching strategy
**So that** CI/CD pipelines trigger correctly and we have a stable release branch

**Acceptance Criteria:**
- [ ] A `main` branch is created from the current `feature/cta-and-blog` branch
- [ ] `main` is set as the default branch in GitHub repository settings
- [ ] Branch protection rules are enabled on `main`: require PR reviews, require status checks to pass, disallow force pushes
- [ ] The `deploy-production.yml` workflow triggers on push to `main`
- [ ] The `deploy-preview.yml` workflow triggers on PRs targeting `main`
- [ ] A test PR from `feature/cta-and-blog` to `main` triggers the preview deployment workflow
- [ ] The branching convention is documented: `feature/*`, `fix/*`, `chore/*` branches off `main`

**Dependencies:** None
**Estimate:** S

---

### US-INFRA-6: Configure DNS and domain routing
**As a** developer
**I want to** configure DNS records for `keptpages.com`, `app.keptpages.com`, and `api.keptpages.com`
**So that** the marketing site, web app, and API each resolve to their correct hosting targets

**Acceptance Criteria:**
- [ ] The domain `keptpages.com` is added to Cloudflare and nameservers are updated at the registrar
- [ ] DNS is active and Cloudflare is the authoritative nameserver
- [ ] `keptpages.com` resolves to Cloudflare Pages for the landing page
- [ ] `app.keptpages.com` resolves to the Cloudflare Pages project `keptpages-web`
- [ ] `api.keptpages.com` resolves to the Cloudflare Worker `keptpages-api`
- [ ] SSL/TLS is set to "Full (Strict)" for all subdomains
- [ ] `www.keptpages.com` redirects (301) to `keptpages.com`
- [ ] A staging subdomain `api-staging.keptpages.com` is configured for preview Worker
- [ ] All configured domains respond with valid HTTPS certificates

**Dependencies:** Domain registrar access, Cloudflare account access
**Estimate:** M

---

### US-INFRA-7: Configure GitHub Actions secrets for CI/CD
**As a** developer
**I want to** populate all GitHub repository secrets referenced by the CI/CD workflows
**So that** the production and preview deployment pipelines can authenticate with Cloudflare and Supabase

**Acceptance Criteria:**
- [ ] `CLOUDFLARE_API_TOKEN` secret is set with appropriate scopes (Workers Scripts:Edit, Pages:Edit, Account:Read)
- [ ] `CLOUDFLARE_ACCOUNT_ID` secret is set
- [ ] `SUPABASE_URL` secret is set (used as `VITE_SUPABASE_URL` in build)
- [ ] `SUPABASE_ANON_KEY` secret is set (used as `VITE_SUPABASE_ANON_KEY`)
- [ ] `SUPABASE_ACCESS_TOKEN` secret is set for CLI operations
- [ ] `SUPABASE_DB_PASSWORD` secret is set
- [ ] `STRIPE_PUBLIC_KEY` secret is set (live publishable key)
- [ ] `STRIPE_PUBLIC_KEY_TEST` secret is set (test publishable key for previews)
- [ ] A push to `main` completes all CI/CD jobs without authentication failures
- [ ] A test PR triggers preview deploy without secret-related errors

**Dependencies:** US-INFRA-1, US-INFRA-5
**Estimate:** S

---

### US-INFRA-8: Set up local development environment
**As a** developer
**I want to** have a complete local development setup with working `.env` files and local Supabase
**So that** any developer can clone the repo and run the full stack locally

**Acceptance Criteria:**
- [ ] `packages/web/.env.example` has local-dev values: `VITE_SUPABASE_URL=http://127.0.0.1:54321`, `VITE_API_URL=http://localhost:8787/api`
- [ ] `packages/worker/.dev.vars.example` is updated with local Supabase URL and service role key placeholders
- [ ] `supabase start` launches the full local Supabase stack
- [ ] `supabase db reset` applies the migration and creates all tables/policies locally
- [ ] Copying `.env.example` to `.env` and running `pnpm dev` starts the full stack
- [ ] Creating a user via local auth auto-creates a `profiles` row (trigger fires locally)
- [ ] Setup steps are documented in order: prerequisites, `supabase start`, copy env files, `pnpm install`, `pnpm dev`

**Dependencies:** US-INFRA-1
**Estimate:** M

---

### US-INFRA-9: Set up Supabase storage buckets for file uploads
**As a** developer
**I want to** create Supabase Storage buckets for user avatars and collection cover images
**So that** the frontend can upload and display profile photos and collection covers

**Acceptance Criteria:**
- [ ] An `avatars` storage bucket is created with public access
- [ ] A `covers` storage bucket is created for collection cover images
- [ ] File size limits are set: avatars max 2MB, covers max 5MB
- [ ] Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- [ ] RLS policies enforce: authenticated users upload to their own path (`{user_id}/*`), public read access
- [ ] A storage migration file is created (e.g., `002_storage_buckets.sql`)
- [ ] Uploading a test avatar/cover image succeeds and returns a public URL

**Dependencies:** US-INFRA-1
**Estimate:** S

---

## Epic 2: Blog Feature (BLOG)

### US-BLOG-1: Blog database schema design
**As a** backend developer
**I want to** define a `blog_posts` table with all necessary columns for content, metadata, and SEO
**So that** blog content can be stored, queried, and rendered with full SEO support

**Acceptance Criteria:**
- [ ] Table `blog_posts` exists with columns: `id` (UUID PK), `title` (TEXT NOT NULL), `slug` (TEXT UNIQUE NOT NULL), `content` (TEXT NOT NULL — Markdown), `excerpt` (TEXT), `cover_image_url` (TEXT), `author` (TEXT DEFAULT 'KeptPages Team'), `tags` (TEXT[]), `category` (TEXT DEFAULT 'preservation-tips'), `status` (blog_post_status ENUM: draft/published/archived), `published_at` (TIMESTAMPTZ), `seo_title` (TEXT), `seo_description` (TEXT), `og_image_url` (TEXT), `created_at`, `updated_at`
- [ ] A `blog_post_status` ENUM type is created
- [ ] `updated_at` trigger uses the existing `update_updated_at()` function
- [ ] Indexes: UNIQUE on `slug`, GIN on `tags`, composite on `(status, published_at DESC)`, full-text search on `title` + `content`
- [ ] Blog posts are public read, service-role write (no RLS needed)

**Dependencies:** None
**Estimate:** S

---

### US-BLOG-2: Supabase migration for blog tables
**As a** backend developer
**I want to** create a numbered migration file that provisions the blog schema
**So that** the blog tables deploy consistently via `supabase db push`

**Acceptance Criteria:**
- [ ] Migration file at `supabase/migrations/003_blog_schema.sql` (after waitlist fix migration)
- [ ] Creates `blog_post_status` ENUM, `blog_posts` table, `updated_at` trigger, all indexes
- [ ] Migration is idempotent
- [ ] Includes category check constraint: `preservation-tips`, `family-stories`, `product-updates`
- [ ] Header comments match the style of `001_initial_schema.sql`

**Dependencies:** US-BLOG-1
**Estimate:** S

---

### US-BLOG-3: Worker API routes for blog (public)
**As a** frontend developer
**I want to** consume RESTful API endpoints for listing and reading blog posts
**So that** the blog pages can fetch and display content

**Acceptance Criteria:**
- [ ] Route module at `packages/worker/src/routes/blog.js`
- [ ] `GET /api/blog` returns paginated published posts (status = 'published', ordered by `published_at DESC`) with `page`, `limit`, `category`, `tag` query params
- [ ] Response includes pagination metadata: `total`, `page`, `limit`, `totalPages`
- [ ] `GET /api/blog/:slug` returns a single published post with all fields including full `content`
- [ ] Returns 404 if slug does not exist or post is not published
- [ ] Mounted as public in `index.js` alongside waitlist
- [ ] Error responses follow existing format: `{ error: 'message' }`

**Dependencies:** US-BLOG-2
**Estimate:** M

---

### US-BLOG-4: Blog admin API routes
**As a** site administrator
**I want to** create, update, and publish blog posts through authenticated API endpoints
**So that** blog content can be managed programmatically

**Acceptance Criteria:**
- [ ] `POST /api/blog/admin` creates a new draft post
- [ ] `PUT /api/blog/admin/:id` updates post fields
- [ ] `DELETE /api/blog/admin/:id` soft-deletes by setting status to 'archived'
- [ ] `PUT /api/blog/admin/:id/publish` sets status to 'published' and `published_at` to now()
- [ ] Admin routes protected by `X-Admin-Key` header validation against `env.ADMIN_API_KEY`
- [ ] Slug auto-generated from title if not provided
- [ ] Validation: required fields on create, reject duplicate slugs (409)

**Dependencies:** US-BLOG-3
**Estimate:** M

---

### US-BLOG-5: Blog listing page
**As a** website visitor
**I want to** browse a list of blog posts on a dedicated page
**So that** I can discover preservation tips, family stories, and product updates

**Acceptance Criteria:**
- [ ] Blog listing renders at `/blog` matching the KeptPages design system (warm cream bg, Fraunces headings, Newsreader body, Outfit labels)
- [ ] Includes shared Nav (with Blog link active) and Footer
- [ ] Section header uses Outfit 11px uppercase terracotta label with Fraunces heading
- [ ] Post cards show: cover image, category label, title, excerpt, author, date, tag pills
- [ ] Cards follow design system: `bg-surface`, `border-light`, `radius-md`, `shadow-sm`, hover lift
- [ ] Category filter tabs: All, Preservation Tips, Family Stories, Product Updates
- [ ] Loading skeleton during fetch, pagination when > 10 posts
- [ ] Empty state with friendly message when no posts exist
- [ ] Scroll reveal animations matching landing page pattern
- [ ] Page is lazy-loaded in the router

**Dependencies:** US-BLOG-3, US-BLOG-6, US-BLOG-11
**Estimate:** L

---

### US-BLOG-6: Blog navigation integration
**As a** website visitor
**I want to** see a "Blog" link in the navigation and footer
**So that** I can easily discover and navigate to the blog

**Acceptance Criteria:**
- [ ] Nav component includes a "Blog" link navigating to `/blog`
- [ ] Blog link positioned between logo and "Join Waitlist" CTA
- [ ] Link uses Outfit 13px weight 500, `text-walnut`, hover `text-terracotta`
- [ ] Active state on blog pages (terracotta color or underline)
- [ ] Footer includes "Blog" link alongside Privacy, Terms, Contact
- [ ] On blog pages, Nav CTA links to `/#signup` instead of `scrollToSignup`

**Dependencies:** None
**Estimate:** S

---

### US-BLOG-7: Blog post detail page
**As a** website visitor
**I want to** read a full blog post with rich content rendering
**So that** I can consume articles in a beautifully typeset layout

**Acceptance Criteria:**
- [ ] Renders at `/blog/:slug`, fetches from `GET /api/blog/:slug`
- [ ] Uses MarketingLayout with Nav and Footer
- [ ] Heading: Fraunces 34px mobile / 42px desktop, weight 600, `text-walnut`
- [ ] Body: Newsreader 17px, line-height 1.65
- [ ] Cover image full-width with `radius-md`
- [ ] Category label above title (Outfit 11px uppercase, terracotta)
- [ ] Author + date below title in Outfit, `text-secondary`
- [ ] Markdown renders with styled headings, blockquotes (gold-light bg, gold left border), lists, code, images, links (terracotta)
- [ ] "Back to Blog" link above article
- [ ] Loading skeleton and 404 state for invalid slugs
- [ ] Content container: `max-w-[680px]` for readability
- [ ] Lazy-loaded in router

**Dependencies:** US-BLOG-3, US-BLOG-11
**Estimate:** L

---

### US-BLOG-8: Blog SEO meta tags and structured data
**As a** marketing manager
**I want to** blog posts to have proper meta tags, Open Graph, and JSON-LD
**So that** posts rank well in search and show rich previews on social media

**Acceptance Criteria:**
- [ ] Listing page: `<title>Blog | KeptPages</title>`, appropriate `<meta description>`
- [ ] Post page: `<title>` from `seo_title` (fallback `title`), `<meta description>` from `seo_description` (fallback `excerpt`)
- [ ] Open Graph tags: `og:title`, `og:description`, `og:image`, `og:type=article`, `og:url`
- [ ] Twitter Card tags: `twitter:card=summary_large_image`, title, description, image
- [ ] JSON-LD `BlogPosting` structured data: headline, description, image, author, dates, publisher
- [ ] `<link rel="canonical">` set to `https://keptpages.com/blog/{slug}`
- [ ] Meta tags managed via `react-helmet-async` or custom `useHead` hook
- [ ] Listing page includes JSON-LD `@type: Blog`

**Dependencies:** US-BLOG-5, US-BLOG-7
**Estimate:** M

---

### US-BLOG-9: Blog CTA components for waitlist conversion
**As a** marketing manager
**I want to** email capture CTAs within and after blog posts
**So that** blog readers convert into waitlist subscribers

**Acceptance Criteria:**
- [ ] Inline CTA renders within post content at a configurable point (e.g., after 3rd paragraph or `<!-- cta -->` marker)
- [ ] End-of-post CTA renders below every post's content, above footer
- [ ] Both include: Fraunces heading, Newsreader subheading, email input, terracotta "Join Waitlist" button
- [ ] `bg-surface-warm` with `border-light` and `radius-lg`
- [ ] Submits to `POST /api/waitlist` with `source: 'blog'` for tracking
- [ ] Success state with sage green checkmark, error state with inline validation
- [ ] `source` prop defaults to `'blog-inline'` or `'blog-end'`

**Dependencies:** US-BLOG-7
**Estimate:** M

---

### US-BLOG-10: Blog content strategy scaffolding
**As a** content manager
**I want to** an initial category structure and seed posts defined
**So that** the blog launches with clear taxonomy and sample content

**Acceptance Criteria:**
- [ ] Three categories enforced: `preservation-tips`, `family-stories`, `product-updates`
- [ ] Seed SQL inserts at least one sample draft post per category (3 posts total)
- [ ] Seed posts include realistic titles, excerpts, and placeholder content (3+ paragraphs each)
- [ ] Seed posts have `status = 'draft'` (not publicly visible until published)
- [ ] Constants file at `packages/web/src/config/blogCategories.js` with display names and slugs
- [ ] Category display names: "Preservation Tips", "Family Stories", "Product Updates"

**Dependencies:** US-BLOG-2
**Estimate:** S

---

### US-BLOG-11: Blog routes in React Router
**As a** frontend developer
**I want to** blog pages registered in React Router
**So that** `/blog` and `/blog/:slug` resolve to the correct components

**Acceptance Criteria:**
- [ ] `ROUTES` config includes `BLOG: '/blog'` and `BLOG_POST: '/blog/:slug'`
- [ ] Routes added to `App.jsx` inside `<MarketingLayout />` group
- [ ] Blog pages lazy-loaded: `const BlogListing = lazy(() => import('@/pages/Blog'))`
- [ ] Navigating to `/blog` renders listing, `/blog/some-slug` renders detail
- [ ] Unknown slugs display a 404 state
- [ ] Browser back/forward navigation works correctly

**Dependencies:** None
**Estimate:** S

---

### US-BLOG-12: Blog RSS feed endpoint
**As a** blog reader
**I want to** subscribe via RSS
**So that** I receive new posts automatically in my feed reader

**Acceptance Criteria:**
- [ ] `GET /api/blog/rss` returns valid RSS 2.0 XML with `Content-Type: application/rss+xml`
- [ ] Channel includes title, link, description, language, lastBuildDate
- [ ] Each published post as `<item>` with title, link, description, pubDate, guid, categories
- [ ] Returns 20 most recent published posts
- [ ] Valid per RSS validator
- [ ] Blog listing page includes `<link rel="alternate" type="application/rss+xml">` tag
- [ ] Small RSS icon link on blog listing page

**Dependencies:** US-BLOG-3
**Estimate:** S

---

### US-BLOG-13: Blog admin management interface
**As a** site administrator
**I want to** create, edit, and publish blog posts through a basic admin UI
**So that** non-technical team members can manage content without SQL

**Acceptance Criteria:**
- [ ] Admin page at `/admin/blog` (protected route, admin-only access)
- [ ] Lists all posts (including drafts) with: title, status pill, category, date, action buttons
- [ ] "New Post" button opens form: title, slug (auto-generated), content textarea, excerpt, category dropdown, tags, cover image URL, SEO fields
- [ ] "Save Draft" and "Publish" buttons
- [ ] Edit mode pre-populates all fields
- [ ] Validates title and content not empty
- [ ] Uses KeptPages design system
- [ ] Alternatively: clear docs for managing posts via Supabase Dashboard

**Dependencies:** US-BLOG-4
**Estimate:** XL

---

## Epic 3: Payments & Subscriptions (PAY)

### US-PAY-1: Create and configure Stripe account
**As a** KeptPages founder
**I want to** create a Stripe account configured for the business
**So that** we have a payment processor ready to accept subscriptions and one-time payments

**Acceptance Criteria:**
- [ ] Stripe account created under KeptPages business name
- [ ] Test mode enabled, test API keys generated
- [ ] `STRIPE_SECRET_KEY` stored as Cloudflare Workers secret
- [ ] `VITE_STRIPE_PUBLIC_KEY` added to web `.env`
- [ ] Dashboard branding configured (logo, colors, support email)
- [ ] Tax settings reviewed for target market
- [ ] Checklist for switching test → live keys before launch

**Dependencies:** None
**Estimate:** S

---

### US-PAY-2: Create Stripe products and prices
**As a** KeptPages founder
**I want to** create Stripe Products and Prices matching the plan definitions
**So that** checkout session creation can reference real Price IDs

**Acceptance Criteria:**
- [ ] Stripe Product "Keeper Plan" created with description and metadata
- [ ] Recurring Price for Keeper Annual at $39.99/year with lookup_key `keeper_yearly`
- [ ] Recurring Price for Keeper Monthly (e.g., $4.99/month) with lookup_key `keeper_monthly`
- [ ] Price IDs updated in worker Stripe service or stored as env variables
- [ ] Stripe Product "Book Project" created for one-time book orders at $14.99 base
- [ ] `packages/web/src/config/plans.js` updated with `stripePriceId` fields
- [ ] Pricing component updated to show monthly/annual toggle
- [ ] All prices verified in Stripe Dashboard test mode

**Dependencies:** US-PAY-1
**Estimate:** M

---

### US-PAY-3: Wire Stripe public key to frontend
**As a** frontend developer
**I want to** ensure the Stripe publishable key flows through Vite into the app
**So that** client-side Stripe.js can initialize and redirect to Checkout

**Acceptance Criteria:**
- [ ] `VITE_STRIPE_PUBLIC_KEY` set in `.env` with test publishable key
- [ ] `config.stripePublicKey` resolves to a real value at runtime
- [ ] `@stripe/stripe-js` package added to `packages/web`
- [ ] `getStripe()` singleton created using `loadStripe(config.stripePublicKey)`
- [ ] Checkout method redirects to `session.url` after getting session from backend
- [ ] Graceful error toast if `stripePublicKey` is falsy

**Dependencies:** US-PAY-1
**Estimate:** S

---

### US-PAY-4: Register Stripe webhook endpoint
**As a** backend developer
**I want to** register the webhook endpoint with Stripe
**So that** Stripe can notify our Worker of payment events

**Acceptance Criteria:**
- [ ] Webhook endpoint created in Stripe Dashboard pointing to `https://api.keptpages.com/api/stripe/webhook`
- [ ] Configured events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Signing secret stored as `STRIPE_WEBHOOK_SECRET` in Workers secrets
- [ ] For local dev, `stripe listen --forward-to localhost:8787/api/stripe/webhook` documented
- [ ] Webhook responds with 200 to Stripe's test ping

**Dependencies:** US-PAY-1
**Estimate:** S

---

### US-PAY-5: Test end-to-end checkout flow (free to Keeper upgrade)
**As a** free-tier user
**I want to** click "Upgrade Now" and complete Stripe Checkout to become a Keeper
**So that** I can unlock unlimited scans and premium features

**Acceptance Criteria:**
- [ ] "Upgrade Now" triggers `POST /api/stripe/checkout` with plan identifier
- [ ] Worker creates/finds Stripe Customer linked to Supabase profile
- [ ] Checkout session created with correct Price ID, mode, metadata, success/cancel URLs
- [ ] Frontend redirects to Stripe hosted checkout
- [ ] Test card `4242 4242 4242 4242` completes successfully
- [ ] Redirect to `/checkout/success?session_id={ID}` — success page confirms subscription
- [ ] Cancel URL `/checkout/cancel` allows retry
- [ ] Webhook updates Supabase profile: `tier = 'keeper'`, `stripe_subscription_id` stored
- [ ] Settings page reflects updated tier

**Dependencies:** US-PAY-2, US-PAY-3, US-PAY-4
**Estimate:** L

---

### US-PAY-6: Test webhook handling for subscription lifecycle events
**As a** backend developer
**I want to** verify all Stripe webhook events are correctly handled
**So that** subscription state stays in sync

**Acceptance Criteria:**
- [ ] `checkout.session.completed`: sets profile to active + stores subscription ID
- [ ] `customer.subscription.updated`: updates status/plan/period from Stripe
- [ ] `customer.subscription.deleted`: sets status canceled, plan free
- [ ] `invoice.payment_succeeded`: records payment, ensures active status
- [ ] `invoice.payment_failed`: sets status `past_due` (currently missing — must add)
- [ ] Gracefully handles missing user profiles
- [ ] Idempotent: replaying events doesn't create duplicates
- [ ] All events tested via `stripe trigger <event>` CLI
- [ ] Errors return HTTP 200 to prevent Stripe retries

**Dependencies:** US-PAY-4, US-PAY-5
**Estimate:** M

---

### US-PAY-7: Stripe Customer Portal for self-service subscription management
**As a** Keeper subscriber
**I want to** manage my subscription from Settings via Stripe's Customer Portal
**So that** I can update payment method, switch plans, or cancel

**Acceptance Criteria:**
- [ ] Stripe Customer Portal configured with allowed actions, branding, return URL
- [ ] New worker route `POST /api/stripe/portal` creates portal session and returns URL
- [ ] Settings page replaces inline "Cancel Subscription" with "Manage Subscription" button
- [ ] The missing `POST /api/stripe/cancel` route is either implemented or removed in favor of portal
- [ ] Free-tier users don't see "Manage Subscription"
- [ ] Returning from portal re-fetches subscription data
- [ ] Portal shows current plan, billing date, payment method

**Dependencies:** US-PAY-1, US-PAY-5, US-PAY-6
**Estimate:** M

---

### US-PAY-8: Wire Lulu Print API credentials and validate integration
**As a** backend developer
**I want to** configure Lulu Direct API credentials and validate the print integration
**So that** the existing Lulu service code can create real print jobs

**Acceptance Criteria:**
- [ ] Lulu Direct developer account created
- [ ] OAuth2 client credentials obtained
- [ ] `LULU_CLIENT_ID` and `LULU_CLIENT_SECRET` stored as Workers secrets
- [ ] `.dev.vars.example` updated to use correct variable names (code expects `LULU_CLIENT_ID`/`LULU_CLIENT_SECRET`, not `LULU_API_KEY`/`LULU_API_SECRET`)
- [ ] Sandbox environment used for testing
- [ ] OAuth2 token acquisition verified
- [ ] Test print job created with sample PDFs
- [ ] Pod package ID `0850X1100BWSTDLW060UW444MNG` confirmed valid
- [ ] Error handling verified: invalid creds, expired tokens

**Dependencies:** None
**Estimate:** M

---

### US-PAY-9: Book pricing and checkout flow for physical book orders
**As a** KeptPages user
**I want to** purchase a printed book through a one-time Stripe checkout
**So that** I receive a professionally printed keepsake

**Acceptance Criteria:**
- [ ] Pricing calculator: base $79, max $149, $0.50/extra page, 15% family pack discount for 5+ copies
- [ ] `subscriptionStore.purchaseBookProject(collectionId)` triggers one-time payment checkout
- [ ] Worker creates `mode: 'payment'` session for book orders
- [ ] Dynamic pricing based on page count and quantity
- [ ] Order metadata includes collectionId, pageCount, quantity, shippingLevel
- [ ] Webhook creates fulfillment record linking payment to Lulu print job
- [ ] Order confirmation page with details, estimated delivery, tracking link
- [ ] Shipping address collected via Stripe Checkout or pre-checkout form
- [ ] Family pack discount applied via Stripe coupon or server-side calculation

**Dependencies:** US-PAY-2, US-PAY-3, US-PAY-8
**Estimate:** XL

---

### US-PAY-10: Real-time subscription status sync between Stripe and Supabase
**As a** KeptPages user
**I want to** always see my correct subscription tier reflected immediately
**So that** feature access matches my payment status

**Acceptance Criteria:**
- [ ] Supabase `profiles` has columns: `stripe_customer_id`, `subscription_status`, `subscription_plan`, `stripe_subscription_id`, `subscription_period_end` — verify/create migration
- [ ] Webhook-driven sync (primary): all webhooks write canonical state to Supabase
- [ ] API-driven sync (secondary): `GET /api/user/profile` returns subscription data for store hydration
- [ ] Store maps plan values to tier for feature gating (`canScan()`, `canCreateCollection()`)
- [ ] Grace period: `past_due` retains Keeper for up to 7 days with warning banner
- [ ] Cancellation: retains access until `subscription_period_end`, then reverts to free
- [ ] On app load/tab focus, `fetchSubscription()` refreshes from backend
- [ ] Feature gates use `subscriptionStore.tier` as single source of truth

**Dependencies:** US-PAY-5, US-PAY-6, US-PAY-7
**Estimate:** L

---

## Epic 4: Auth, API Wiring & Core Features (CORE)

### US-CORE-1: Fix waitlist migration — add missing columns ✅ DONE
**As a** backend developer
**I want to** add the missing `source`, `referral_code`, `ip_address`, `user_agent` columns to the waitlist table
**So that** the waitlist worker INSERT succeeds instead of throwing a "column does not exist" error

**Acceptance Criteria:**
- [ ] New migration `002_add_waitlist_columns.sql` adds: `source TEXT DEFAULT 'website'`, `referral_code TEXT`, `ip_address TEXT`, `user_agent TEXT`
- [ ] Migration is idempotent (`ADD COLUMN IF NOT EXISTS`)
- [ ] `POST /waitlist` with source/referral params returns 201 and all columns populated
- [ ] Existing rows are not deleted or corrupted
- [ ] `waitlist_insert_public` RLS policy still permits anonymous inserts

**Dependencies:** None
**Estimate:** S

---

### US-CORE-2: Configure Supabase auth providers ✅ DONE
**As a** new user
**I want to** sign up and log in with email/password or Google OAuth
**So that** I can access my account using my preferred method

**Acceptance Criteria:**
- [ ] Email/password provider enabled with email confirmation
- [ ] Google OAuth configured with valid Google Cloud OAuth client ID/secret
- [ ] Supabase redirect URL registered in Google Cloud Console
- [ ] `supabase.auth.signUp()` sends confirmation email
- [ ] `supabase.auth.signInWithOAuth({ provider: 'google' })` redirects and returns session
- [ ] Environment variables documented

**Dependencies:** US-CORE-3
**Estimate:** M

---

### US-CORE-3: Wire real Supabase client (remove demo mode) ✅ DONE
**As a** developer
**I want to** connect the frontend to a real Supabase instance
**So that** all calls function against real data instead of no-op stubs

**Acceptance Criteria:**
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in `.env`
- [ ] `isSupabaseConfigured` evaluates to `true`
- [ ] `createClient` called with real credentials
- [ ] `supabase.auth.getSession()` returns real sessions
- [ ] `supabase.from().select()` returns actual rows
- [ ] Console no longer shows "running in demo mode" warning
- [ ] Worker `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` also configured

**Dependencies:** None
**Estimate:** S

---

### US-CORE-4: End-to-end auth flow testing ✅ DONE
**As a** QA tester
**I want to** verify the complete auth lifecycle
**So that** users can reliably create accounts, verify, login, persist sessions, and logout

**Acceptance Criteria:**
- [ ] Signup creates user in Supabase and triggers confirmation email
- [ ] Clicking confirmation link activates account
- [ ] Login sets `user` and `session` in Zustand store, JWT in localStorage
- [ ] Browser refresh restores session via `authStore.initialize()`
- [ ] `onAuthStateChange` fires on login/logout/token refresh
- [ ] Logout clears session from store and localStorage
- [ ] Google OAuth flow sets user and session
- [ ] Password reset sends email and completes without error

**Dependencies:** US-CORE-2, US-CORE-3
**Estimate:** L

---

### US-CORE-5: Wire Gemini API key and test scan-to-extract flow ✅ DONE
**As a** user scanning a document
**I want to** upload a photo and have Gemini Flash extract the text
**So that** I get a structured digital version without manual transcription

**Acceptance Criteria:**
- [ ] `GEMINI_API_KEY` configured as Workers secret
- [ ] `POST /scan` accepts multipart upload, stores in R2, returns scan record
- [ ] `POST /scan/:id/process` sends image to Gemini 2.0 Flash and parses JSON response
- [ ] Extracted data includes `type`, `title`, `content`, `confidence`, and (for recipes) `ingredients`/`instructions`
- [ ] Scan record updated to `status: 'completed'` with extracted data and confidence score
- [ ] On API error, scan set to `status: 'error'` with error message
- [ ] Processed JSON stored in R2 `PROCESSED` bucket

**Dependencies:** US-CORE-3
**Estimate:** M

---

### US-CORE-6: Wire Claude API key for reprocess/fallback extraction
**As a** user viewing a low-confidence result
**I want to** click "Reprocess with AI" to re-extract via Claude Sonnet
**So that** I get a more accurate transcription

**Acceptance Criteria:**
- [ ] `ANTHROPIC_API_KEY` configured as Workers secret
- [ ] `POST /scan/:id/reprocess` sends image to Claude Sonnet API with previous result as context
- [ ] On success, scan record updated with new extracted data, confidence, `ai_model: 'claude-sonnet'`
- [ ] Reprocessed JSON stored in R2
- [ ] On error, scan status set to `'error'` with message
- [ ] "Reprocess with AI" button (visible when `confidence < 0.7`) triggers flow and reloads editor

**Dependencies:** US-CORE-5
**Estimate:** M

---

### US-CORE-7: Implement "Add to Collection" flow from ScanDetail
**As a** user reviewing a scanned document
**I want to** click "Add to Collection" and pick or create a collection
**So that** I can organize documents instead of seeing a "coming soon" toast

**Acceptance Criteria:**
- [ ] `handleAddToCollection` in ScanDetail opens a collection picker modal (replaces toast)
- [ ] Picker lists existing collections and offers "Create New Collection"
- [ ] Selecting a collection calls `POST /collections/:id/items` with scan ID
- [ ] Creating a new collection creates it and immediately adds the scan
- [ ] Success toast shows collection name, modal closes
- [ ] Error toast on failure, modal stays open for retry

**Dependencies:** US-CORE-3, US-CORE-5
**Estimate:** M

---

### US-CORE-8: Implement "Add Document" flow in Collection page
**As a** user viewing a collection
**I want to** click "Add Document" and select from existing scans
**So that** I can build collections from previously scanned documents

**Acceptance Criteria:**
- [ ] "Add Document" button opens document picker modal (replaces toast)
- [ ] Picker shows scans not already in this collection with title, type, thumbnail, date
- [ ] Multi-select and confirm adds documents via API
- [ ] New documents appear at end with correct `sort_order`
- [ ] Empty state directs user to Scan page if no unassigned scans
- [ ] Error toast on failure, picker stays open

**Dependencies:** US-CORE-3, US-CORE-5
**Estimate:** M

---

### US-CORE-9: End-to-end scan flow testing
**As a** QA tester
**I want to** verify the complete scan pipeline from upload through extraction to review
**So that** the core scanning feature ships with confidence

**Acceptance Criteria:**
- [ ] Scan page transitions: CHOOSE → PREVIEW → UPLOADING correctly
- [ ] ImagePreprocessor renders, "Confirm" triggers upload + process
- [ ] Upload stores image in R2, returns scan record with UUID
- [ ] Process calls Gemini, returns extracted data with confidence
- [ ] Navigates to ScanDetail with PhotoPanel (image) and TextPanel (extracted fields)
- [ ] Confidence badge displays correctly (green >= 0.7, gold >= 0.5, terracotta < 0.5)
- [ ] Editing fields marks dirty, autosave fires after 1500ms
- [ ] Processing failure shows error toast and returns to PREVIEW

**Dependencies:** US-CORE-3, US-CORE-5
**Estimate:** L

---

### US-CORE-10: Collection PDF export testing
**As a** user with a completed collection
**I want to** click "Export PDF" and receive a valid PDF
**So that** I can download or print a formatted version of my documents

**Acceptance Criteria:**
- [ ] "Export PDF" calls `POST /collections/:id/export` with loading state
- [ ] Worker fetches items, generates PDF via `generateBookPdf()`, stores in R2
- [ ] Generated PDF is valid and opens in standard readers
- [ ] PDF includes collection title cover page and document content pages
- [ ] Recipes render with title, ingredients, instructions, notes
- [ ] 400 error if collection has zero documents
- [ ] Success/failure toasts

**Dependencies:** US-CORE-7 or US-CORE-8
**Estimate:** M

---

### US-CORE-11: Sharing flow testing
**As a** user sharing a collection
**I want to** generate a share link that family can view without logging in
**So that** non-technical family members can see preserved documents

**Acceptance Criteria:**
- [ ] `POST /share` creates share record with unique token, returns URL
- [ ] `GET /shared/:token` (public) returns collection data and items
- [ ] Expired links return 410
- [ ] Views increment `view_count`
- [ ] Invalid tokens return 404
- [ ] Frontend renders shared collection in read-only mode
- [ ] **Note:** Worker references a `shares` table not in `001_initial_schema.sql` — migration needed (or update worker to use `share_invites`)

**Dependencies:** US-CORE-7 or US-CORE-8, US-CORE-3
**Estimate:** L

---

### US-CORE-12: R2 upload flow testing
**As a** QA tester
**I want to** verify scan images upload to and retrieve from R2 correctly
**So that** images are durable and accessible for processing

**Acceptance Criteria:**
- [ ] `UPLOADS` and `PROCESSED` R2 bindings accessible in worker
- [ ] Upload stores at `{userId}/{timestamp}-{uuid}.{ext}` with correct MIME type
- [ ] Process retrieves image from R2, `arrayBuffer()` matches original
- [ ] Processed JSON stored in `PROCESSED` bucket
- [ ] Correct MIME types on all objects
- [ ] Files > 20MB rejected with 400 before reaching R2

**Dependencies:** US-CORE-3, US-CORE-5
**Estimate:** M

---

### US-CORE-13: Settings page wiring
**As a** logged-in user
**I want to** update my profile and avatar and have changes persist
**So that** my information is accurate across the app

**Acceptance Criteria:**
- [ ] Changing display name and saving calls API, updates `profiles.display_name`
- [ ] Avatar upload stores image, returns public URL, saves to `profiles.avatar_url`
- [ ] Refreshing page loads updated name and avatar from database
- [ ] Email field populated and read-only
- [ ] Subscription status, tier, usage stats display real data
- [ ] "Export All Data" button calls export endpoint
- [ ] Error toast on save failure, form retains edits

**Dependencies:** US-CORE-3, US-CORE-4
**Estimate:** M

---

## Epic 5: PDF Export Customization (EXPORT) — NEW

### US-EXPORT-1: Fix PDF TOC page numbering and content overflow
**As a** user exporting a collection
**I want** the table of contents page numbers to be correct and all content to render fully
**So that** I can navigate the PDF and not lose any document content

**Acceptance Criteria:**
- [ ] TOC page numbers reflect actual start page of each document (not hardcoded `tocStartPage = 4`)
- [ ] Multi-page documents handled: when content overflows a page, a continuation page is added
- [ ] Recipes with 30+ ingredients render fully (no silent truncation)
- [ ] Instructions that overflow continue on next page
- [ ] TOC accounts for multi-page documents when numbering subsequent entries
- [ ] Existing tests pass

**Dependencies:** None
**Estimate:** M
**Tier:** All users

---

### US-EXPORT-2: Add export options to PDF service
**As a** developer
**I want** `generateBookPdf()` to accept an options parameter for template, font, sections, and page numbers
**So that** the export can be customized without breaking existing callers

**Acceptance Criteria:**
- [ ] `generateBookPdf(book, documents, options = {})` accepts options: `template`, `fontFamily`, `includeTitlePage`, `includeCopyright`, `includeToc`, `showPageNumbers`
- [ ] Font mapping: `serif` → TimesRoman, `sans-serif` → Helvetica, `monospace` → Courier (all pdf-lib StandardFonts)
- [ ] Title page, copyright page, TOC conditionally rendered based on flags
- [ ] Page numbers centered in footer when enabled
- [ ] No options = exact current behavior (backward compatible)
- [ ] Unit tests for each option

**Dependencies:** US-EXPORT-1
**Estimate:** M

---

### US-EXPORT-3: Accept export options in API endpoint
**As a** developer
**I want** `POST /collections/:id/export` to accept options in the request body
**So that** the frontend can pass customization choices to the PDF generator

**Acceptance Criteria:**
- [ ] Accepts optional body: `{ template, fontFamily, includeTitlePage, includeCopyright, includeToc, showPageNumbers, documentIds }`
- [ ] If `documentIds` array provided, filter and reorder documents accordingly (export-only ordering)
- [ ] All options passed to `generateBookPdf()`
- [ ] Empty body = current defaults (backward compatible)
- [ ] Validation: `documentIds` must contain valid scan IDs belonging to the collection

**Dependencies:** US-EXPORT-2
**Estimate:** S

---

### US-EXPORT-4: Export Options Modal (Keeper only)
**As a** Keeper user
**I want** a modal where I can customize my PDF export before generating it
**So that** I can control the template, font, sections, document selection, and ordering

**Acceptance Criteria:**
- [ ] `ExportOptionsModal` component created at `packages/web/src/components/collection/ExportOptionsModal.jsx`
- [ ] Template selection: Classic, Modern, Minimal (radio cards)
- [ ] Font selection: Serif, Sans-Serif, Monospace (dropdown)
- [ ] Section toggles: Title Page, Copyright Page, Table of Contents (checkboxes, default checked)
- [ ] Page Numbers toggle (checkbox, default checked)
- [ ] Document list with checkboxes and up/down reorder buttons
- [ ] Select All / Deselect All toggle
- [ ] Validation: at least 1 document must be selected
- [ ] Uses existing Modal/Button/Input component patterns

**Dependencies:** US-EXPORT-3
**Estimate:** L

---

### US-EXPORT-5: Tier-gated export flow in Collection page
**As a** product owner
**I want** export customization to be gated behind the Keeper tier
**So that** it drives upgrade conversions while free users still get a working basic export

**Acceptance Criteria:**
- [ ] Keeper users: Clicking "Export PDF" opens `ExportOptionsModal`; submitting calls API with options
- [ ] Free users: Clicking "Export PDF" triggers direct export with defaults (no modal)
- [ ] Free users see a subtle upgrade nudge after successful export
- [ ] Export download flow (blob URL) works for both tiers
- [ ] Loading/error states handled for both paths

**Dependencies:** US-EXPORT-4
**Estimate:** S

---

### US-EXPORT-6: Update marketing messaging for PDF customization
**As a** product owner
**I want** the Keeper feature lists and upgrade prompts to mention PDF customization
**So that** users know this benefit exists when considering an upgrade

**Acceptance Criteria:**
- [ ] `plans.js`: FREE features changes `'PDF export'` → `'Basic PDF export'`
- [ ] `plans.js`: KEEPER and KEEPER_MONTHLY features add `'Custom PDF export'`
- [ ] Scan page upgrade modal includes "Custom PDF export" in features list
- [ ] Settings page upgrade card auto-updates (reads from PLANS.KEEPER.features)

**Dependencies:** US-EXPORT-5
**Estimate:** S

---

### US-EXPORT-7: Color theme templates
**As a** Keeper user
**I want** to choose from visually distinct color themes for my PDF export
**So that** my family heritage book has a beautiful, personalized aesthetic

**Acceptance Criteria:**
- [ ] 5 color themes: Heritage (warm terracotta/gold), Garden (sage green/brown), Heirloom (navy/gold), Parchment (sepia/amber), Modern (black/terracotta accent)
- [ ] Each theme defines: accentColor, titleColor, sectionColor, bodyColor, lineColor, borderColor, ornamentColor, pageBgColor
- [ ] Parchment theme draws a light parchment-colored background rectangle on content pages
- [ ] Title page uses accent color for decorative elements
- [ ] Section headers and separator lines use theme colors
- [ ] ExportOptionsModal shows color swatches for each theme (3-color strip preview)
- [ ] No options / free tier = Heritage theme as default (backward compatible)
- [ ] Tests for all 5 templates

**Dependencies:** US-EXPORT-2
**Estimate:** M
**Tier:** Keeper

---

### US-EXPORT-8: Decorative page graphics
**As a** Keeper user
**I want** decorative borders, dividers, and ornaments in my PDF export
**So that** the book feels professionally designed, not just plain text

**Acceptance Criteria:**
- [ ] Page borders: rectangle stroke around content area, configurable per theme
- [ ] Corner ornaments: L-shaped decorative corners on content pages
- [ ] Section dividers: ornamental divider between documents
- [ ] Title page decoration: accent color block behind title, ornamental rule below
- [ ] TOC pages get matching page borders
- [ ] Helper functions: drawPageBorder(), drawCornerOrnaments(), drawSectionDivider(), drawTitlePageDecoration()
- [ ] All decorations use pdf-lib primitives only
- [ ] Each theme specifies borderStyle, dividerStyle, ornamentStyle
- [ ] Tests verify decorative rendering doesn't error

**Dependencies:** US-EXPORT-7
**Estimate:** M
**Tier:** Keeper

---

### US-EXPORT-9: Embed original scan images in PDF
**As a** Keeper user
**I want** the original scanned photo included in the PDF alongside the transcribed text
**So that** I can see both the original handwriting and the digitized version

**Acceptance Criteria:**
- [ ] "Include Original Scans" toggle in ExportOptionsModal
- [ ] When enabled, export endpoint fetches scan images from R2 using r2_key
- [ ] Each document gets a dedicated scan image page before its text pages
- [ ] Image scaled to fit content margins, centered
- [ ] Caption below image: document title + "Original Scan" in italic
- [ ] TOC page numbering accounts for additional scan pages
- [ ] Supports JPEG and PNG (skip WEBP/HEIC with warning)
- [ ] Memory guard: max 30 images or 50MB total
- [ ] Graceful fallback: if R2 fetch fails, skip and continue
- [ ] Images fetched at route level, not inside PDF service
- [ ] Supabase query expanded to include r2_key, mime_type from scans
- [ ] Tests with small mock image buffers

**Dependencies:** US-EXPORT-7
**Estimate:** L
**Tier:** Keeper

---

## Epic 6: Testing, QA & Launch Readiness (QA)

### US-QA-1: Run existing unit test suite and fix failures
**As a** developer
**I want to** run the full test suite and fix every failure
**So that** we have a reliable green baseline

**Acceptance Criteria:**
- [ ] `pnpm --filter @keptpages/web test` passes all 37+ test files with exit code 0
- [ ] `pnpm --filter @keptpages/worker test` passes all 6 test files with exit code 0
- [ ] Failing tests updated to match current source
- [ ] Skipped tests either implemented or documented with reason
- [ ] CI workflows updated to run `pnpm -r test` (currently only runs build)
- [ ] Test coverage report generated and documented

**Dependencies:** None
**Estimate:** M

---

### US-QA-2: Add integration tests for critical API flows
**As a** developer
**I want to** integration tests exercising Worker API routes against mocked bindings
**So that** API regressions are caught before deployment

**Acceptance Criteria:**
- [ ] Tests cover `scan` route: upload, extract, verify Supabase insert
- [ ] Tests cover `collections` route: CRUD, RLS-scoped queries
- [ ] Tests cover `share` route: generate link, access as unauthenticated, read-only
- [ ] Tests cover `books` route: create, add docs, list
- [ ] Uses `createMockContext` helpers consistent with existing patterns
- [ ] All pass in CI
- [ ] Error cases tested: 401, 403, 400, 413

**Dependencies:** US-QA-1
**Estimate:** L

---

### US-QA-3: Add E2E tests for core user journeys
**As a** product owner
**I want to** automated E2E tests for critical paths
**So that** cross-cutting regressions are caught

**Acceptance Criteria:**
- [ ] Playwright configured at monorepo root
- [ ] E2E: signup flow (navigate, fill form, verify redirect)
- [ ] E2E: scan flow (create collection, upload image, verify extracted text)
- [ ] E2E: collection management (rename, delete document, verify empty state)
- [ ] E2E: sharing (generate link, open in new context, verify read-only)
- [ ] E2E: landing page (all 11 sections render, CTA navigates to signup)
- [ ] E2E: upgrade flow (free user sees bar, clicks upgrade, Stripe appears)
- [ ] `pnpm test:e2e` script in root `package.json`
- [ ] E2E runs in CI on preview deployments

**Dependencies:** US-QA-1, US-QA-2
**Estimate:** XL

---

### US-QA-4: Set up error monitoring (Sentry)
**As a** developer
**I want to** Sentry configured for both web and worker
**So that** runtime exceptions are captured and alertable

**Acceptance Criteria:**
- [ ] `@sentry/react` in web, initialized with environment-aware DSN
- [ ] React ErrorBoundary integrates with Sentry
- [ ] Sentry SDK in worker wraps Hono app
- [ ] Source maps uploaded during CI build
- [ ] Worker errors include request path, user ID, environment
- [ ] Alert rules: notify on new issue, error rate > 10/min
- [ ] DSN values stored as secrets, not hardcoded
- [ ] Manual test confirms errors appear in Sentry within 30s

**Dependencies:** None
**Estimate:** M

---

### US-QA-5: Set up analytics with event tracking
**As a** product owner
**I want to** lightweight analytics for key user actions
**So that** we can measure usage and conversion funnels

**Acceptance Criteria:**
- [ ] Privacy-respecting analytics integrated (Plausible, PostHog, or CF Web Analytics)
- [ ] Events tracked: `signup_completed`, `login_completed`, `scan_started`, `scan_completed`, `collection_created`, `share_link_generated`, `upgrade_initiated`, `upgrade_completed`
- [ ] Page views tracked automatically
- [ ] Landing page CTA clicks tracked with section context
- [ ] Analytics disabled in development
- [ ] `analytics.js` service module with `track(eventName, properties?)` function
- [ ] Dashboard accessible with test events from staging

**Dependencies:** None
**Estimate:** M

---

### US-QA-6: Performance audit (Lighthouse, bundle size, Core Web Vitals)
**As a** developer
**I want to** audit and optimize performance
**So that** the site loads fast and ranks well

**Acceptance Criteria:**
- [ ] Lighthouse: Performance >= 90, Accessibility >= 90, Best Practices >= 90, SEO >= 90
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Bundle analysis run, chunks > 100KB code-split
- [ ] Images use modern formats (WebP/AVIF), `loading="lazy"`
- [ ] Fonts preloaded with `font-display: swap`
- [ ] Route-based code splitting verified
- [ ] Performance budget documented: max initial JS 200KB gzipped

**Dependencies:** US-QA-5
**Estimate:** L

---

### US-QA-7: Accessibility audit (WCAG 2.1 AA)
**As a** user with accessibility needs
**I want to** use KeptPages with screen reader, keyboard, and high contrast
**So that** the product is usable by everyone

**Acceptance Criteria:**
- [ ] axe-core audit passes with zero critical/serious violations on all pages
- [ ] All interactive elements keyboard-navigable in logical tab order
- [ ] Modals trap focus and return focus on close
- [ ] All images have descriptive `alt` text
- [ ] Color contrast meets AA (4.5:1 normal, 3:1 large)
- [ ] Form inputs have labels or `aria-label`; errors via `aria-live`
- [ ] Scan upload usable via keyboard
- [ ] Skip-to-content link present
- [ ] axe integration test in CI

**Dependencies:** None
**Estimate:** L

---

### US-QA-8: Mobile responsiveness QA
**As a** mobile user
**I want to** a fully functional experience at all screen sizes
**So that** I can scan and manage documents from my phone

**Acceptance Criteria:**
- [ ] All pages reviewed at: 320px, 375px, 390px, 768px, 1024px, 1280px
- [ ] Landing page stacks vertically on mobile, no horizontal overflow
- [ ] Dashboard cards reflow to single column on mobile
- [ ] Scan detail: image zoomable, text panel doesn't overlap
- [ ] Nav: hamburger menu works, adequate touch targets (44x44px)
- [ ] Modals full-screen on mobile, dismissible
- [ ] No text truncation or overflow at any breakpoint
- [ ] Touch interactions work on mobile devices

**Dependencies:** None
**Estimate:** L

---

### US-QA-9: Security review
**As a** developer
**I want to** a thorough security review of RLS, auth, input handling, CORS
**So that** user data is protected

**Acceptance Criteria:**
- [ ] RLS policies verified: every table has RLS, policies enforce `auth.uid() = user_id`
- [ ] Cross-user access test: user cannot read/update/delete another user's data
- [ ] JWT validation verified: secret, expiry, `sub` claim used downstream
- [ ] Input sanitization: XSS payloads in collection names escaped/rejected
- [ ] File upload validates: type, size, content type matches actual content
- [ ] CORS: only `keptpages.com` origins allowed
- [ ] Stripe webhook validates `stripe-signature`
- [ ] Rate limiting on auth and upload endpoints
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to frontend
- [ ] No secrets in source code or build output

**Dependencies:** None
**Estimate:** L

---

### US-QA-10: Pre-launch checklist (favicon, meta tags, 404, loading/empty states)
**As a** first-time visitor
**I want to** a polished, professional experience
**So that** the product feels trustworthy

**Acceptance Criteria:**
- [ ] Favicon set with multiple sizes + `site.webmanifest`
- [ ] Open Graph meta tags on landing page (title, description, image, URL, type)
- [ ] Twitter Card meta tags set
- [ ] Unique `<title>` and `<meta description>` per page
- [ ] Custom 404 page for unmatched routes
- [ ] All pages show loading skeletons while fetching
- [ ] List pages show meaningful empty states with CTA
- [ ] Error states show user-friendly message with retry
- [ ] `robots.txt` allows landing, blocks `/app/*`
- [ ] `sitemap.xml` generated
- [ ] Canonical URLs set

**Dependencies:** None
**Estimate:** M

---

### US-QA-11: Clean up static HTML landing pages and screenshot artifacts
**As a** developer
**I want to** remove or archive static HTML files superseded by the React landing page
**So that** the repo is clean with a single source of truth

**Acceptance Criteria:**
- [ ] Decision documented on each file: root `index.html`, `landing/index.html`, design system MDs, `screenshot-*.html`, `ss-*.png`
- [ ] If removed: all 14+ artifact files deleted
- [ ] If kept: moved to `docs/archive/` and excluded from build
- [ ] CF Pages deploys from `packages/web/dist` only (no conflicts)
- [ ] React landing page confirmed as canonical
- [ ] No broken links to removed files

**Dependencies:** None
**Estimate:** S

---

### US-QA-12: Production environment validation (staging deploy + smoke test)
**As a** developer preparing for launch
**I want to** deploy to staging and systematically smoke-test every flow
**So that** production deployment will work correctly

**Acceptance Criteria:**
- [ ] All GitHub Secrets configured and verified
- [ ] Worker secrets set via `wrangler secret put`
- [ ] Staging deployment triggered via PR and preview URL functional
- [ ] Smoke: landing page loads, all 11 sections render, CTA works
- [ ] Smoke: email/password signup + verification flow works
- [ ] Smoke: Google OAuth works
- [ ] Smoke: user can create collection, upload photo, see AI-extracted text within 30s
- [ ] Smoke: share link works without auth
- [ ] Smoke: Stripe checkout with test card works
- [ ] Smoke: free-tier limits enforced
- [ ] Smoke: password reset works end-to-end
- [ ] DB migrations run successfully
- [ ] Worker health check responds 200
- [ ] Custom domain + SSL verified
- [ ] All results documented in launch checklist

**Dependencies:** US-QA-1, US-QA-4, US-QA-9, US-QA-10, US-QA-11
**Estimate:** XL

---

## Epic 8: Mobile & Desktop UX Friction Fixes (UX)

> Identified via expert UI/UX audit of all pages, components, and layouts on 2026-03-10.
> Priority: P0 (Critical) → P1 (High Impact) → P2 (Medium Polish).
> All stories are frontend-only changes (no API/DB work required).

---

### US-UX-1: Toast notifications mobile positioning (P0 Critical)
**As a** mobile user
**I want to** see toast notifications above the bottom navigation bar
**So that** I don't miss important success/error feedback

**Problem:** Toasts render at `bottom-6 right-6` (fixed position) but the `BottomTabs` nav bar occupies the bottom of the screen at `z-40`. On mobile, toasts overlap or hide behind the tab bar.

**Acceptance Criteria:**
- [ ] Toasts appear above the bottom tab bar on mobile (minimum `bottom-20`)
- [ ] Toasts remain right-aligned at `bottom-6 right-6` on desktop (≥1024px)
- [ ] Toast container is full-width on mobile with horizontal padding
- [ ] No z-index conflicts with bottom tabs or modals
- [ ] Tested at 360px, 390px, and 414px viewport widths

**File:** `packages/web/src/components/ui/Toast.jsx:98`
**Fix:** Change container classes to `fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-[9999]`
**Dependencies:** None
**Estimate:** XS

---

### US-UX-2: Collection action buttons mobile layout (P0 Critical)
**As a** mobile user viewing a collection
**I want to** see clearly organized action buttons that don't overflow
**So that** I can easily find and use Add, Scan, Export, and Delete functions

**Problem:** The collection page has 5 action buttons (Add Document, Scan New, Export PDF, Create Book, Delete) in a `flex-wrap` row. On narrow screens they wrap unpredictably with inconsistent sizing.

**Acceptance Criteria:**
- [ ] Buttons stack vertically on mobile (<640px) with full-width primary actions
- [ ] Buttons display in a horizontal row on desktop (≥640px)
- [ ] Primary actions (Scan New) are visually prominent
- [ ] Destructive action (Delete) is visually separated from other actions
- [ ] Tested at 320px and 375px widths

**File:** `packages/web/src/pages/Collection/index.jsx:316`
**Fix:** Change `flex flex-wrap` to `flex flex-col sm:flex-row flex-wrap` and add `w-full sm:w-auto` to primary buttons
**Dependencies:** None
**Estimate:** S

---

### US-UX-3: Document card mobile action layout (P0 Critical)
**As a** mobile user managing documents in a collection
**I want to** easily reorder and remove documents without the card becoming too tall
**So that** I can manage my collection efficiently on a small screen

**Problem:** Up/down/remove buttons are stacked vertically (3 buttons × 44px = 132px column) beside each document card. This makes cards very tall on mobile, reducing the number of visible items.

**Acceptance Criteria:**
- [ ] On mobile, action buttons display in a horizontal row below the card content
- [ ] On desktop, action buttons remain in the vertical column layout
- [ ] All buttons maintain 44px minimum touch targets
- [ ] Card layout is compact enough to show 3+ cards on a mobile viewport

**File:** `packages/web/src/components/collection/DocumentCard.jsx:107`
**Fix:** Wrap action buttons in responsive layout: `flex flex-row sm:flex-col` and move below content on mobile
**Dependencies:** None
**Estimate:** S

---

### US-UX-4: Camera controls safe-area padding (P0 Critical)
**As a** mobile user scanning a document on a notched/pill-shaped phone
**I want to** access the capture button without it being behind the home indicator
**So that** I can take photos without struggling with the UI

**Problem:** Camera controls have `py-6` padding but no `env(safe-area-inset-bottom)` padding. On iPhones with the home indicator bar, the capture button sits behind it.

**Acceptance Criteria:**
- [ ] Camera capture button clears the home indicator on all iOS devices
- [ ] Safe area padding is applied to the bottom of camera controls
- [ ] No visual regression on Android devices or non-notched phones
- [ ] Tested in Chrome DevTools with iPhone 14/15 Pro frame

**File:** `packages/web/src/components/scan/CameraCapture.jsx`
**Fix:** Add `pb-[calc(1.5rem+env(safe-area-inset-bottom))]` to camera controls container
**Dependencies:** None
**Estimate:** XS

---

### US-UX-5: Export modal state persistence (P0 Critical)
**As a** Keeper user customizing a PDF export
**I want to** keep my template/font/document selections if I accidentally close the modal
**So that** I don't have to redo all my customization choices

**Problem:** `resetState()` is called in the `onClose` handler, so accidentally clicking the backdrop or pressing Escape erases all template, font, and document selections.

**Acceptance Criteria:**
- [ ] Closing the modal (backdrop click, Escape, Cancel button) preserves selections
- [ ] Reopening the modal shows previously chosen options
- [ ] State resets only after a successful export completes
- [ ] State resets when navigating away from the collection page

**File:** `packages/web/src/components/collection/ExportOptionsModal.jsx:156-159`
**Fix:** Remove `resetState()` from close handler; call it only inside the `handleSubmit` success path
**Dependencies:** None
**Estimate:** XS

---

### US-UX-6: DropZone mobile optimization (P0 Critical)
**As a** mobile user uploading a document photo
**I want to** see a compact upload area with mobile-appropriate instructions
**So that** the interface doesn't waste screen space with irrelevant desktop features

**Problem:** DropZone has `p-10` (40px) padding making it very tall on mobile. The "Drop your photo here" copy references drag-and-drop which doesn't exist on mobile browsers.

**Acceptance Criteria:**
- [ ] Padding reduced to `p-6` on mobile, `p-10` on desktop
- [ ] Mobile copy reads "Tap to choose a photo" instead of "Drop your photo here or click to browse"
- [ ] Desktop copy remains "Drop your photo here or click to browse"
- [ ] Upload icon is smaller on mobile (single icon instead of two)

**File:** `packages/web/src/components/scan/DropZone.jsx:73,120`
**Fix:** Responsive padding `p-6 sm:p-10`, conditional text via media query or responsive classes
**Dependencies:** None
**Estimate:** S

---

### US-UX-7: Document removal confirmation (P0 Critical)
**As a** user managing a collection
**I want to** confirm before a document is removed from the collection
**So that** I don't accidentally lose documents due to a mis-tap

**Problem:** Tapping the remove (X) button immediately removes the document with no confirmation. On mobile, fat-finger taps can accidentally trigger removal.

**Acceptance Criteria:**
- [ ] Tapping remove shows a confirmation prompt (inline toast with undo, or small modal)
- [ ] User must confirm before removal executes
- [ ] Confirmation auto-dismisses after 5 seconds if no action taken (for toast approach)
- [ ] Desktop behavior matches mobile

**File:** `packages/web/src/pages/Collection/index.jsx:127-133`
**Fix:** Add confirmation modal or implement "undo" toast pattern with delayed API call
**Dependencies:** None
**Estimate:** S

---

### US-UX-8: Scan page header responsive layout (P0 Critical)
**As a** mobile user on a very narrow screen
**I want to** see the scan page heading and usage badge without overlap
**So that** I can clearly read both the page title and my remaining scan count

**Problem:** The header uses `flex justify-between` causing the "New Scan" heading and "23 of 25 scans used" badge to collide on screens narrower than 360px.

**Acceptance Criteria:**
- [ ] Header stacks vertically on narrow screens (<640px)
- [ ] Badge appears below the heading with proper spacing
- [ ] Horizontal layout preserved on desktop

**File:** `packages/web/src/pages/Scan/index.jsx`
**Fix:** Change to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`
**Dependencies:** None
**Estimate:** XS

---

### US-UX-9: Error toast auto-dismiss timing (P0 Critical)
**As a** user who encounters an error
**I want to** have enough time to read and understand error messages
**So that** I can take appropriate action (retry, contact support, etc.)

**Problem:** All toast variants (success, error, info) auto-dismiss after 4 seconds. Error messages like "Failed to export PDF" or "Failed to save profile" need more time to read and comprehend.

**Acceptance Criteria:**
- [ ] Success toasts auto-dismiss after 4 seconds (unchanged)
- [ ] Error toasts auto-dismiss after 7 seconds
- [ ] Info toasts auto-dismiss after 5 seconds
- [ ] Manual dismiss still works for all variants

**File:** `packages/web/src/components/ui/Toast.jsx:47`
**Fix:** Add variant-based timing: `const DURATIONS = { success: 4000, error: 7000, info: 5000 }`
**Dependencies:** None
**Estimate:** XS

---

### US-UX-10: TopBar dropdown overflow guard (P0 Critical)
**As a** mobile user tapping their profile avatar
**I want to** see the dropdown menu fully on screen
**So that** I can access Settings and Sign Out without horizontal scrolling

**Problem:** The user dropdown menu is `w-44` (176px) with `absolute right-0`. On very narrow screens (<360px), the menu may clip or cause horizontal overflow.

**Acceptance Criteria:**
- [ ] Dropdown menu never extends beyond viewport edges
- [ ] Max width constrained to available viewport width minus padding
- [ ] Menu positioning works correctly at 320px viewport width

**File:** `packages/web/src/components/layout/AppLayout.jsx:227`
**Fix:** Add `max-w-[calc(100vw-2rem)]` to the dropdown div
**Dependencies:** None
**Estimate:** XS

---

### US-UX-11: Loading skeleton placeholders (P1 High Impact)
**As a** user waiting for the dashboard or collection to load
**I want to** see skeleton placeholders that match the final layout
**So that** the page doesn't feel broken or empty during loading

**Problem:** Both Dashboard and Collection pages show only a centered `<Spinner>` inside a `py-20` container. Users see a blank cream page with a small spinner, which feels broken.

**Acceptance Criteria:**
- [ ] Dashboard loading shows skeleton card grid (pulsing rectangles matching CollectionCard dimensions)
- [ ] Collection loading shows skeleton document list
- [ ] Skeleton matches the actual grid layout (1/2/3 columns responsive)
- [ ] Spinner is removed in favor of skeleton
- [ ] Skeleton uses `animate-pulse bg-cream-alt` styling

**Files:** `packages/web/src/pages/Dashboard/index.jsx:125`, `packages/web/src/pages/Collection/index.jsx:207`
**Dependencies:** None
**Estimate:** M

---

### US-UX-12: Collection name edit discoverability on mobile (P1 High Impact)
**As a** mobile user viewing a collection
**I want to** know that I can tap the collection name to edit it
**So that** I can rename my collection without guessing

**Problem:** The collection name is a clickable `<h1>` with only `cursor-pointer` and `:hover` color change as edit affordances. On mobile there is no hover state — users have no visual cue the name is editable.

**Acceptance Criteria:**
- [ ] A small pencil/edit icon appears next to the collection name
- [ ] Icon is subtle (muted color) but visible on mobile
- [ ] Tapping the name or icon enters edit mode
- [ ] Same treatment applied to the description field

**File:** `packages/web/src/pages/Collection/index.jsx:272-311`
**Fix:** Add inline SVG pencil icon with `text-walnut-muted` after the name/description text
**Dependencies:** None
**Estimate:** S

---

### US-UX-13: Upload photo card click handler (P1 High Impact)
**As a** user on the scan page
**I want to** click the "Upload Photo" card to immediately open the file picker
**So that** I don't have to scroll to find a separate upload zone

**Problem:** The "Upload Photo" card has an `onClick` that only triggers the upgrade modal when at the scan limit. When NOT at the limit, clicking the card does nothing — the user must use the separate DropZone below.

**Acceptance Criteria:**
- [ ] Clicking "Upload Photo" card opens the native file picker when scans are available
- [ ] When at the scan limit, clicking shows the upgrade prompt (unchanged)
- [ ] File picker accepts same formats as DropZone (JPEG, PNG, HEIC)

**File:** `packages/web/src/pages/Scan/index.jsx`
**Fix:** Add `onClick` handler that calls `inputRef.current.click()` when not at limit
**Dependencies:** None
**Estimate:** S

---

### US-UX-14: Back-to-collection navigation after scanning (P1 High Impact)
**As a** user who started scanning from a collection page
**I want to** easily navigate back to that collection after the scan completes
**So that** I don't lose my place in the workflow

**Problem:** When scanning from a collection (via `Link state={{ collectionId }}`), the scan detail page may not provide a clear back-navigation link to the originating collection.

**Acceptance Criteria:**
- [ ] Scan detail page shows "Back to [Collection Name]" link when `fromCollection` state is present
- [ ] Link navigates to `/app/collection/:id`
- [ ] When no `fromCollection` state, shows generic "Back to Scans" link

**File:** `packages/web/src/pages/Scan/ScanDetail.jsx`
**Dependencies:** None
**Estimate:** S

---

### US-UX-15: Delete collection with recovery option (P1 High Impact)
**As a** user who accidentally deleted a collection
**I want to** have a way to recover it within a reasonable timeframe
**So that** I don't permanently lose my organized work

**Problem:** Collection deletion is permanent. The confirmation modal exists but there's no undo or recovery mechanism. A toast says "Collection deleted" but there's no way to reverse it.

**Acceptance Criteria:**
- [ ] After deletion, show a toast with "Undo" button (5-second window)
- [ ] If "Undo" is clicked, the deletion is cancelled and user stays on the collection page
- [ ] If timer expires, deletion proceeds as normal
- [ ] Alternative: implement soft-delete with a 30-day recovery in Settings

**Files:** `packages/web/src/pages/Collection/index.jsx:171`, `packages/web/src/components/ui/Toast.jsx`
**Dependencies:** May require API changes for soft-delete approach
**Estimate:** M (toast undo) or L (soft-delete)

---

### US-UX-16: Toast container mobile width (P2 Medium Polish)
**As a** mobile user with a narrow screen
**I want to** see toast notifications that fit within my screen width
**So that** messages are fully readable without horizontal clipping

**Problem:** Toast container has fixed `w-80` (320px) which is wider than some small phones (e.g., iPhone SE at 320px viewport).

**Acceptance Criteria:**
- [ ] Toast container is full-width with padding on mobile
- [ ] Toast container is `w-80` right-aligned on desktop
- [ ] No horizontal scrollbar triggered by toasts

**File:** `packages/web/src/components/ui/Toast.jsx:98`
**Fix:** Change to `w-[calc(100vw-2rem)] sm:w-80`
**Note:** Can be combined with US-UX-1 (same file, same element)
**Dependencies:** US-UX-1
**Estimate:** XS

---

### US-UX-17: Export modal reorder tap targets (P2 Medium Polish)
**As a** mobile user reordering documents in the export modal
**I want to** easily tap the up/down arrows without mis-tapping
**So that** I can arrange documents in my preferred order

**Problem:** The up/down arrows in the export document list are `w-3.5 h-3.5` with `p-1`, resulting in ~22px touch targets — well below the 44px WCAG minimum.

**Acceptance Criteria:**
- [ ] Reorder buttons have minimum 44px × 44px touch area
- [ ] Buttons remain visually compact but with expanded tap area via padding
- [ ] No overlap between adjacent touch targets

**File:** `packages/web/src/components/collection/ExportOptionsModal.jsx:293-310`
**Fix:** Increase padding to `p-2.5` and add `min-w-[44px] min-h-[44px]` to button elements
**Dependencies:** None
**Estimate:** XS

---

### US-UX-18: Signup password strength indicator (P2 Medium Polish)
**As a** new user creating an account
**I want to** see password strength feedback as I type
**So that** I create a secure password and understand the requirements

**Problem:** The signup form validates email format but only checks if a password exists (any length, any complexity). No minimum length or strength feedback is provided.

**Acceptance Criteria:**
- [ ] Minimum password length of 8 characters enforced
- [ ] Visual strength bar shows weak/fair/strong based on character mix
- [ ] Validation error shown if password is too short
- [ ] Strength indicator does not block form submission (advisory only above minimum)

**File:** `packages/web/src/pages/Auth/Signup.jsx`
**Dependencies:** None
**Estimate:** S

---

### US-UX-19: Avatar upload progress indicator (P2 Medium Polish)
**As a** user changing their profile photo
**I want to** see upload progress while my avatar is being saved
**So that** I know the upload is working and don't click away prematurely

**Problem:** `handleAvatarChange` reads the file and `api.upload` runs with no visual feedback. The user sees the preview immediately (via FileReader) but doesn't know if the server upload succeeded until "Profile updated!" toast appears.

**Acceptance Criteria:**
- [ ] Spinner or progress ring overlays the avatar during upload
- [ ] Upload state is visually distinct from the saved state
- [ ] Error state shown if upload fails

**File:** `packages/web/src/pages/Settings/index.jsx:77-84`
**Dependencies:** None
**Estimate:** S

---

### US-UX-20: Upgrade link deep-linking (P2 Medium Polish)
**As a** free-tier mobile user tapping "Upgrade"
**I want to** be taken directly to the upgrade card
**So that** I don't have to scroll through the Settings page to find it

**Problem:** The "UPGRADE" pill in the mobile TopBar navigates to `/app/settings`. The upgrade card is inside the Subscription section, which may require scrolling past the Profile section.

**Acceptance Criteria:**
- [ ] Upgrade link navigates to `/app/settings#subscription` or equivalent
- [ ] Settings page auto-scrolls to the subscription section when hash is present
- [ ] Smooth scroll animation to the target section

**File:** `packages/web/src/components/layout/AppLayout.jsx:213`, `packages/web/src/pages/Settings/index.jsx`
**Fix:** Add `id="subscription"` to subscription section, update link to `/app/settings#subscription`, add `useEffect` scroll-to-hash
**Dependencies:** None
**Estimate:** S
