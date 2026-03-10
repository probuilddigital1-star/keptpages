# Test Coverage Analysis — KeptPages

**Date**: 2026-03-10
**Current Status**: 62 web test files (697 tests), 12 worker test files — all passing

---

## Executive Summary

The codebase has solid test coverage for UI primitives, landing page components, stores, and worker middleware/services. However, there are significant gaps in the **book designer** (the core product feature), **worker API routes** (core business logic), and **critical page-level flows** (Collection, Scan). Out of ~90+ source files across both packages, **~43 have zero test coverage**.

---

## Coverage by Area

### Well-Tested Areas (Good)

| Area | Files Tested | Notes |
|------|-------------|-------|
| UI components (`ui/`) | 9/9 | Full coverage — Button, Modal, Card, etc. |
| Landing page (`landing/`) | 11/11 | All marketing components tested |
| Layout components | 3/3 | AppLayout, MarketingLayout, PublicLayout |
| Zustand stores | 10/10 | All stores tested incl. blueprint tests |
| Auth pages | 3/3 | Login, Signup, ForgotPassword |
| Worker middleware | 4/4 | auth, admin, rateLimit, validate |
| Worker AI services | 3/3 | claude, gemini, confidence |
| Worker PDF service | 1/1 | Extremely thorough (36K-line test file) |
| Hooks | 2/4 | useDebounce, useMediaQuery |
| Utils | 2/4 | formatters, imageProcessing |

### Critical Gaps

#### 1. Book Designer — 0% coverage (13 files untested)

This is the **core product feature** with zero test coverage:

| File | Lines | Risk |
|------|-------|------|
| `PageCanvas.jsx` | ~305 | Canvas rendering, element selection, drag interactions |
| `CanvasElement.jsx` | ~200 | Element rendering (text, image, decorative) with transforms |
| `TextEditOverlay.jsx` | ~150 | Inline text editing on canvas |
| `PageBackground.jsx` | ~80 | Background rendering and bleed area |
| `PhotoFrame.jsx` | ~100 | Photo element with masking and cropping |
| `DecorativeRule.jsx` | ~60 | Decorative line elements |
| 8 panel components | ~1200 total | AddElement, AddPage, CoverDesigner, ElementSettings, GlobalSettings, ImageLibrary, PageList, PageSettings |

**Why this matters**: Bugs in the book designer directly impact the product users pay for. Canvas interactions, element positioning, and panel controls are hard to regression-test manually.

**Recommended tests**:
- `PageCanvas`: Element selection, drag-to-reposition, zoom controls, page navigation
- `CanvasElement`: Rendering different element types, transform handles, selection state
- Panel components: User interactions (button clicks, form changes, drag reorder)
- `constants.js`: Validate dimension calculations for different book sizes

#### 2. Worker API Routes — 6 of 8 routes untested (~2,900 LOC)

| File | Lines | Handles |
|------|-------|---------|
| `routes/books.js` | 865 | PDF generation, Lulu ordering, order status, cover composition |
| `routes/collections.js` | 710 | Collection CRUD, document reordering, export |
| `routes/scan.js` | 552 | Image upload, AI text extraction, confidence scoring |
| `routes/user.js` | 359 | Profile management, preferences, account operations |
| `routes/share.js` | 256 | Public sharing links, access control |
| `routes/stripe.js` | 82 | Checkout session creation |
| `routes/waitlist.js` | 93 | Waitlist signup |

**Why this matters**: These routes contain the core business logic — ordering books, processing scans with AI, managing billing. A bug in `books.js` could generate incorrect PDFs or charge customers incorrectly.

**Recommended tests**:
- `books.js`: Book creation, PDF generation flow, Lulu order submission, status webhooks
- `collections.js`: CRUD operations, document reordering, export to different formats
- `scan.js`: File upload validation, AI service orchestration, error handling for failed extractions
- `stripe.js` (service): Webhook signature verification, subscription state transitions, customer portal URLs

#### 3. Worker Stripe Service — 0% coverage (597 LOC)

| File | Lines | Handles |
|------|-------|---------|
| `services/stripe.js` | 597 | Webhooks, customer portal, subscriptions, pricing logic |

**Why this matters**: Billing bugs can result in revenue loss or overcharging customers. Stripe webhook handling is notoriously error-prone (idempotency, event ordering, signature verification).

**Recommended tests**:
- Webhook event processing for each event type
- Subscription state machine transitions
- Customer portal session creation
- Error handling for Stripe API failures

#### 4. Complex Page Components — 3 critical pages untested

| File | Lines | Risk |
|------|-------|------|
| `pages/Collection/index.jsx` | 587 | Document management, reordering, inline editing, export modals |
| `pages/Scan/index.jsx` | 352 | Multi-step workflow, file handling, subscription limit enforcement |
| `pages/Auth/Callback.jsx` | 58 | OAuth callback — silent failure here locks users out |

**Recommended tests**:
- `Collection`: Document list rendering, drag reorder, delete confirmation, export flow
- `Scan`: File selection, upload progress, processing states, error recovery
- `Callback`: Successful auth redirect, error handling, token exchange

#### 5. Editor Components — 0% coverage

| File | Lines | Risk |
|------|-------|------|
| `editor/PhotoPanel.jsx` | ~150 | Zoom, pan, crop interactions |
| `editor/TextPanel.jsx` | ~268 | Multi-document-type forms, field validation |

#### 6. Image Processing — Untested preprocessing

| File | Lines | Risk |
|------|-------|------|
| `scan/ImagePreprocessor.jsx` | ~198 | Canvas-based contrast enhancement, file conversion |

---

## Priority Recommendations

### Tier 1 — High Impact, Start Here
1. **Worker `routes/books.js`** — Core revenue path (ordering + PDF generation)
2. **Worker `services/stripe.js`** — Billing correctness
3. **Worker `routes/scan.js`** — AI processing pipeline
4. **Web `pages/Collection/index.jsx`** — Most complex page, primary user workflow
5. **Web book designer panels** — Start with `PageListPanel` and `ElementSettingsPanel`

### Tier 2 — Important for Stability
6. **Worker `routes/collections.js`** — Core CRUD operations
7. **Worker `routes/user.js`** — Account management
8. **Web `pages/Scan/index.jsx`** — User-facing workflow
9. **Web `PageCanvas.jsx` + `CanvasElement.jsx`** — Visual rendering (may need canvas mocking)
10. **Web `Auth/Callback.jsx`** — Auth flow reliability

### Tier 3 — Nice to Have
11. Web service wrappers (thin, low risk)
12. Config files (constants only)
13. Analytics/error reporting utilities
14. `useScrollReveal` / `usePageTracking` hooks
15. Worker `routes/waitlist.js` and `services/fonts.js`

---

## Structural Observations

- **Existing test quality is good** — tests focus on behavior (user interactions, state changes) rather than implementation details
- **Strong mocking patterns** — Zustand stores and API calls are well-mocked across the test suite
- **CI runs E2E tests** — Playwright tests partially cover page-level flows, but only 7 spec files exist
- **No coverage reporting configured** — `@vitest/coverage-v8` is not installed; adding it would provide line-level metrics
- **Canvas testing will need special handling** — Konva/canvas components likely need `jest-canvas-mock` or similar for unit testing

---

## Quick Wins

These would give the most coverage improvement for the least effort:

1. **Install `@vitest/coverage-v8`** and add coverage thresholds to CI — this makes regressions visible
2. **Test `constants.js`** — Pure data, easy to validate book dimensions and defaults
3. **Test `Auth/Callback.jsx`** — Small file (58 lines), critical path, easy to mock
4. **Test worker `routes/waitlist.js`** — Small (93 lines), simple CRUD
5. **Test thin service wrappers** — They're small but establish patterns for testing the API layer
