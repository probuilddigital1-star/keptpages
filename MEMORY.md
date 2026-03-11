# KeptPages — Project Memory

## PDF Character Spacing Bug (Critical — Fixed 4 times)

### Root Cause
pdf-lib + @pdf-lib/fontkit has a font subsetting bug. When custom fonts (TTF from KV) are embedded with the default `subset: true`, fontkit drops glyphs, producing text like `"Swee t & Sou r Cabb age"`.

### Fix Requirements (ALL must be true)
1. **`{ subset: false }`** on every `pdfDoc.embedFont()` call for custom fonts
   - File: `packages/worker/src/services/fonts.js:72`
2. **Sequential font embedding** — NEVER use `Promise.all` for concurrent `embedFont` calls
   - fontkit shares internal state on the pdfDoc instance
   - Concurrent embedding causes race conditions that corrupt glyph tables
   - File: `packages/worker/src/services/fonts.js` — both `loadFonts()` and `loadAllFonts()` must be sequential
3. **`env` parameter** must be passed to all PDF generation functions so they can load custom fonts from KV
   - `packages/worker/src/routes/books.js:483` — `loadAllFonts(pdfDoc, [...fontFamilies], env)`
   - `packages/worker/src/routes/books.js:525` — `generateBookPdf(bookMeta, documents, templateToUse, env)`
   - `packages/worker/src/routes/collections.js:657` — `c.env` passed to `generateBookPdf`
4. **FONTS KV binding** must exist in `wrangler.toml` and have font data uploaded
   - Binding: `FONTS` with id `3084fcd1b8d947b48aada1a8780c8eb4`

### Fix History
| Date | Commit | What happened |
|------|--------|---------------|
| 2026-03-08 | `ea309c3` | Initial fix: added `{ subset: false }` |
| 2026-03-09 | `06d8e8e` | Regression: dirty working tree reverted to `subset: true`, re-fixed |
| 2026-03-10 | `4f46dd1` | Extended: `generateBookPdf` now accepts `env` param for custom font loading |
| 2026-03-11 | (current) | Root cause: concurrent `embedFont` calls via `Promise.all` cause fontkit race condition. Changed to sequential loading in both `loadFonts()` and `loadAllFonts()` |

### Key Files
- `packages/worker/src/services/fonts.js` — Font loading with `{ subset: false }` + sequential embedding
- `packages/worker/src/services/pdf.js` — `generateBookPdf()`, `generateCoverPdf()`, `renderBlueprintBook()`
- `packages/worker/src/routes/books.js` — Book Designer PDF generation route (blueprint path)
- `packages/worker/src/routes/collections.js` — Collection export PDF route
- `packages/worker/wrangler.toml` — FONTS KV binding (line 21-23)

### How to Verify
- Generate a Book Designer PDF with text containing mixed characters (spaces, punctuation, accented chars)
- Check that characters are NOT split with extra spaces
- Run: `pnpm --filter @keptpages/worker test` (627 tests should pass)

---

## Cover Photo Not Rendering in PDF (Fixed 2026-03-08)

### Root Cause
CoverDesignerPanel stored cover photos as data URLs locally but never uploaded to R2. PDF generation couldn't access them.

### Fix
- `CoverDesignerPanel.jsx` now uploads photo to R2 when selected
- `bookStore.js` has fallback: uploads cover photo before PDF generation if photoKey is missing
- `pdf.js` renders cover photos for all layouts (centered, left-aligned, photo-background)

### Commit: `8b56de6`
