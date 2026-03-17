/**
 * Font loading service for PDF generation.
 * Loads TTF fonts from Cloudflare KV for embedding in PDFs.
 * Falls back to StandardFonts if KV is unavailable.
 *
 * IMPORTANT: pdf-lib has a bug where CIDFontType2 W arrays have gaps
 * for some glyph IDs. Missing CIDs default to 1000 units width (per PDF spec),
 * causing character spacing issues. fixCIDFontWidths() must be called instead
 * of pdfDoc.save() to patch these gaps. See: packages/worker/fonts/ for static
 * font files that MUST be uploaded to the FONTS KV namespace (not variable fonts).
 */

import { PDFDocument, StandardFonts, PDFName, PDFDict, PDFArray, PDFNumber } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Font key mapping: fontFamily → KV keys
const FONT_KEYS = {
  fraunces: {
    regular: 'font:Fraunces-Regular',
    bold: 'font:Fraunces-Bold',
  },
  newsreader: {
    regular: 'font:Newsreader-Regular',
    bold: 'font:Newsreader-Bold',
    italic: 'font:Newsreader-Italic',
  },
  caveat: {
    regular: 'font:Caveat-Regular',
  },
  outfit: {
    regular: 'font:Outfit-Regular',
    bold: 'font:Outfit-Bold',
  },
};

// Fallback mapping to StandardFonts
const FALLBACK_MAP = {
  fraunces: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic },
  newsreader: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic },
  caveat: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique },
  outfit: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique },
};

/**
 * Load fonts for a given font family from KV and embed them in the PDF document.
 * Returns an object with { regular, bold, italic } embedded font objects.
 *
 * @param {PDFDocument} pdfDoc - The pdf-lib document to embed fonts in
 * @param {string} fontFamily - One of: 'fraunces', 'newsreader', 'caveat', 'outfit'
 * @param {object} env - Worker env with FONTS KV binding
 * @returns {Promise<{regular: PDFFont, bold: PDFFont, italic: PDFFont}>}
 */
export async function loadFonts(pdfDoc, fontFamily, env) {
  const family = fontFamily || 'fraunces';
  const keys = FONT_KEYS[family];
  const fallbacks = FALLBACK_MAP[family] || FALLBACK_MAP.fraunces;

  // If no FONTS KV binding, use standard fonts
  if (!env?.FONTS || !keys) {
    return {
      regular: await pdfDoc.embedFont(fallbacks.regular),
      bold: await pdfDoc.embedFont(fallbacks.bold || fallbacks.regular),
      italic: await pdfDoc.embedFont(fallbacks.italic || fallbacks.regular),
    };
  }

  // Register fontkit for custom font embedding
  pdfDoc.registerFontkit(fontkit);

  const results = {};

  // Load weights sequentially — concurrent embedFont calls with fontkit
  // cause race conditions that corrupt glyph tables (character spacing bug)
  for (const [weight, kvKey] of Object.entries(keys)) {
    try {
      const fontData = await env.FONTS.get(kvKey, 'arrayBuffer');
      if (fontData) {
        results[weight] = await pdfDoc.embedFont(new Uint8Array(fontData), { subset: false });
      }
    } catch (err) {
      console.error(`Failed to load font ${kvKey}:`, err?.message || err);
    }
  }

  // Ensure required weights exist — always use embedded custom fonts, never StandardFonts.
  // Lulu rejects PDFs with unembedded StandardFont references.
  if (!results.regular) {
    // No custom regular loaded — fall back to StandardFonts only when KV unavailable (tests)
    // In production this means KV font data is missing/corrupt
    console.error(`Font ${family}: regular weight failed to load from KV, using StandardFont fallback`);
    results.regular = await pdfDoc.embedFont(fallbacks.regular);
  }
  if (!results.bold) {
    results.bold = results.regular; // Use embedded regular — never StandardFonts
  }
  if (!results.italic) {
    results.italic = results.regular; // Use embedded regular — never StandardFonts
  }

  return results;
}

/**
 * Load multiple font families sequentially.
 * Returns a map of { fontFamily: { regular, bold, italic } }
 *
 * NOTE: Must be sequential, not parallel. fontkit shares internal state
 * on the pdfDoc instance — concurrent embedFont calls corrupt glyph tables,
 * causing the "Swee t & Sou r" character spacing bug.
 */
export async function loadAllFonts(pdfDoc, fontFamilies, env) {
  const unique = [...new Set(fontFamilies)];
  const result = {};
  for (const family of unique) {
    const fonts = await loadFonts(pdfDoc, family, env);
    result[family] = fonts;
  }
  return result;
}

/**
 * Decompress FlateDecode data using the DecompressionStream Web API.
 * Works in Cloudflare Workers and modern browsers (no Node.js zlib needed).
 */
async function decompressFlate(compressed) {
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Fix pdf-lib bug: CIDFontType2 W arrays have gaps for some glyph IDs.
 * Without /DW, missing CIDs default to 1000 units (full em width), causing
 * huge character spacing (e.g. "Un titled Book" instead of "Untitled Book").
 *
 * Strategy: save → reload → for each CIDFontType2, decompress the embedded
 * TTF from FontFile2, parse with fontkit to get ALL glyph widths, rebuild
 * the W array to be complete, then re-save.
 *
 * @param {PDFDocument} pdfDoc - The pdf-lib document (before saving)
 * @returns {Promise<Uint8Array>} - The saved PDF bytes with fixed widths
 */
export async function fixCIDFontWidths(pdfDoc) {
  const bytes = await pdfDoc.save();
  const fixed = await PDFDocument.load(bytes);

  // Collect all CIDFontType2 objects that need patching
  const toPatch = [];
  fixed.context.enumerateIndirectObjects().forEach(([ref, obj]) => {
    if (!(obj instanceof PDFDict)) return;
    const subtype = obj.lookup(PDFName.of('Subtype'));
    if (subtype?.toString() !== '/CIDFontType2') return;

    const descriptorRef = obj.get(PDFName.of('FontDescriptor'));
    const descriptor = fixed.context.lookup(descriptorRef);
    if (!(descriptor instanceof PDFDict)) return;

    const fontFileRef = descriptor.get(PDFName.of('FontFile2'));
    const fontFileStream = fixed.context.lookup(fontFileRef);
    if (!fontFileStream || typeof fontFileStream.getContents !== 'function') return;

    let compressedData;
    try {
      compressedData = fontFileStream.getContents();
    } catch {
      return;
    }

    const filter = fontFileStream.dict?.get(PDFName.of('Filter'));
    toPatch.push({ obj, compressedData, isFlate: filter?.toString() === '/FlateDecode' });
  });

  if (toPatch.length === 0) return bytes;

  // Decompress and patch all fonts in parallel
  let patchCount = 0;
  await Promise.all(toPatch.map(async ({ obj, compressedData, isFlate }) => {
    let ttfData = compressedData;
    if (isFlate) {
      try {
        ttfData = await decompressFlate(compressedData);
      } catch (err) {
        console.error('Font decompression failed:', err?.message || err);
        return;
      }
    }

    let fkFont;
    try {
      fkFont = fontkit.create(ttfData);
    } catch (err) {
      console.error('fontkit parse failed:', err?.message || err);
      return;
    }

    const numGlyphs = fkFont.numGlyphs;
    const unitsPerEm = fkFont.unitsPerEm || 1000;
    const scale = 1000 / unitsPerEm;

    // Build complete W array: [0 [w0 w1 w2 ... wN]]
    const widths = [];
    for (let gid = 0; gid < numGlyphs; gid++) {
      try {
        const glyph = fkFont.getGlyph(gid);
        const width = glyph ? Math.round(glyph.advanceWidth * scale * 2) / 2 : 0;
        widths.push(PDFNumber.of(width));
      } catch {
        widths.push(PDFNumber.of(0));
      }
    }

    const wInner = PDFArray.withContext(fixed.context);
    widths.forEach((w) => wInner.push(w));

    const wArray = PDFArray.withContext(fixed.context);
    wArray.push(PDFNumber.of(0));
    wArray.push(wInner);

    obj.set(PDFName.of('W'), wArray);
    obj.set(PDFName.of('DW'), PDFNumber.of(0));
    patchCount++;
  }));

  if (patchCount > 0) {
    return fixed.save();
  }
  return bytes;
}
