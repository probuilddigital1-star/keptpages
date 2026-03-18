# KeptPages — Project Memory

## PDF Character Spacing Bug (Critical — DEFINITIVE FIX)

### Root Cause
pdf-lib generates **incomplete CIDFontType2 W (width) arrays** when embedding TrueType fonts
with `{ subset: false }`. Out of 698 glyphs, 74 glyph IDs are missing from the W array.
Per PDF spec, missing CIDs default to 1000 units width (full em), causing huge character
spacing — e.g., "Un titled Book" or "Swee t & Sou r Cabb age".

This is a **deterministic pdf-lib bug**, NOT a race condition. Sequential vs parallel font
loading does not fix it. The W array gaps are identical regardless of loading order.

### Fix: fixCIDFontWidths() — DO NOT REMOVE THIS FUNCTION
The fix is `fixCIDFontWidths()` in `packages/worker/src/services/fonts.js`. It:
1. Saves the PDF via `pdfDoc.save()`
2. Reloads with `PDFDocument.load(bytes)`
3. Finds all CIDFontType2 font dictionaries
4. Decompresses embedded TTF from FontFile2 (FlateDecode → `DecompressionStream` Web API)
5. Parses with fontkit to compute ALL glyph widths
6. Rebuilds W array as `[0 [w0 w1 w2 ... wN]]` (complete, no gaps)
7. Sets /DW=0 as safety fallback
8. Re-saves the fixed PDF

### All Requirements (ALL must be true)
1. **`{ subset: false }`** on every `pdfDoc.embedFont()` call for custom fonts
2. **`fixCIDFontWidths(pdfDoc)`** must be called INSTEAD of `pdfDoc.save()` at all 3 save points:
   - `packages/worker/src/services/pdf.js` ~line 758: `generateBookPdf()` interior
   - `packages/worker/src/services/pdf.js` ~line 965: `generateCoverPdf()` cover
   - `packages/worker/src/routes/books.js` ~line 514: blueprint path interior
3. **Static (non-variable) font files** in FONTS KV — variable fonts cause fontkit issues
4. **FONTS KV binding** in `wrangler.toml` with id `3084fcd1b8d947b48aada1a8780c8eb4`
5. **`env` parameter** passed to PDF generation functions for KV font loading
6. **Test mock** in `books.test.js` must include `fixCIDFontWidths: vi.fn((pdfDoc) => pdfDoc.save())`

### Technical Details
- Embedded fonts in saved PDFs are FlateDecode compressed (zlib, `78 9c` header)
- `PDFRawStream.getContents()` returns COMPRESSED bytes, NOT decompressed TTF
- Must use `DecompressionStream('deflate')` Web API (works in CF Workers, no nodejs_compat needed)
- `fontkit.create()` accepts `Uint8Array` directly (no `Buffer` needed)

### Fix History
| Date | Commit | What happened |
|------|--------|---------------|
| 2026-03-08 | `ea309c3` | Initial fix: added `{ subset: false }` |
| 2026-03-09 | `06d8e8e` | Regression: dirty working tree reverted to `subset: true`, re-fixed |
| 2026-03-10 | `4f46dd1` | Extended: `generateBookPdf` now accepts `env` param |
| 2026-03-10 | (local) | Implemented `fixCIDFontWidths()` with DecompressionStream — the real fix |
| 2026-03-11 | `c2c59a6` | REGRESSION: remote session removed fixCIDFontWidths, tried sequential loading (wrong fix) |
| 2026-03-11 | (current) | Restored fixCIDFontWidths, merged with sequential loading changes |

### Key Files
- `packages/worker/src/services/fonts.js` — `loadFonts()`, `loadAllFonts()`, `fixCIDFontWidths()`
- `packages/worker/src/services/pdf.js` — `generateBookPdf()`, `generateCoverPdf()`
- `packages/worker/src/routes/books.js` — Blueprint PDF generation
- `packages/worker/src/routes/collections.js` — Collection export PDF
- `packages/worker/wrangler.toml` — FONTS KV binding

---

## Cover Photo Not Rendering in PDF (Fixed 2026-03-08)

### Root Cause
CoverDesignerPanel stored cover photos as data URLs locally but never uploaded to R2. PDF generation couldn't access them.

### Fix
- `CoverDesignerPanel.jsx` now uploads photo to R2 when selected
- `bookStore.js` has fallback: uploads cover photo before PDF generation if photoKey is missing
- `pdf.js` renders cover photos for all layouts (centered, left-aligned, photo-background)

### Commit: `8b56de6`

---

## UX Epic Complete — 20/20 Stories (2026-03-11)

All 20 mobile/desktop friction fix stories are now done. Key implementations:

### Stories Completed in This Session (US-UX-11, 14, 15, 18)
- **US-UX-11**: Replaced `<Spinner>` with skeleton card grids (Dashboard) and skeleton document lists (Collection). Uses `animate-pulse bg-cream-alt` styling matching the responsive grid layout.
- **US-UX-14**: ScanDetail now shows "Back to [Collection Name]" when navigated from a collection. Passes `fromCollectionName` through route state from Scan → ScanDetail.
- **US-UX-15**: Delete collection uses toast with "Undo" button and 5-second delayed API call. User navigates away immediately; clicking Undo cancels deletion. Works on both Dashboard and Collection page.
- **US-UX-18**: Password strength indicator with 3-bar visual (weak/fair/strong), minimum 8 characters enforced. Checks length, case mix, digits, and special characters.

### Toast Action Support
Added `action` parameter to `toast()` function for undo/action buttons:
```js
toast('Deleted', 'info', { label: 'Undo', onClick: () => { cancelled = true; } });
```
File: `packages/web/src/components/ui/Toast.jsx`

### Key Files Modified
- `packages/web/src/pages/Dashboard/index.jsx` — SkeletonCard component, undo delete
- `packages/web/src/pages/Collection/index.jsx` — Skeleton loading, undo delete with timer
- `packages/web/src/pages/Scan/ScanDetail.jsx` — Back-to-collection with name
- `packages/web/src/pages/Scan/index.jsx` — Passes fromCollectionName state
- `packages/web/src/pages/Auth/Signup.jsx` — Password strength indicator
- `packages/web/src/components/ui/Toast.jsx` — Action button support

### Test Status
All 1,416 tests passing (789 frontend + 627 worker, 88 test files)

---

## RLS Enabled on Articles Table (2026-03-18)

### Issue
Supabase lint flagged `public.articles` as exposed via PostgREST without Row Level Security enabled.

### Fix
Migration `019_enable_rls_articles.sql`:
- `ALTER TABLE articles ENABLE ROW LEVEL SECURITY`
- SELECT policy allows public reads only for `status = 'published'` articles
- Draft/archived articles hidden from public queries
- Write operations (INSERT/UPDATE/DELETE) restricted to `service_role` (Cloudflare Worker)

### Key File
- `supabase/migrations/019_enable_rls_articles.sql`
