/**
 * Font loading service for PDF generation.
 * Loads TTF fonts from Cloudflare KV for embedding in PDFs.
 * Falls back to StandardFonts if KV is unavailable.
 */

import { StandardFonts } from 'pdf-lib';
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

  // Load all available weights in parallel
  const loadPromises = Object.entries(keys).map(async ([weight, kvKey]) => {
    try {
      const fontData = await env.FONTS.get(kvKey, 'arrayBuffer');
      if (fontData) {
        results[weight] = await pdfDoc.embedFont(new Uint8Array(fontData));
      }
    } catch (err) {
      console.error(`Failed to load font ${kvKey}:`, err?.message || err);
    }
  });

  await Promise.all(loadPromises);

  // Ensure required weights exist with fallbacks
  if (!results.regular) {
    results.regular = await pdfDoc.embedFont(fallbacks.regular);
  }
  if (!results.bold) {
    results.bold = results.regular; // Degrade gracefully
  }
  if (!results.italic) {
    // Try to use the standard italic, or fall back to regular
    try {
      results.italic = await pdfDoc.embedFont(fallbacks.italic || fallbacks.regular);
    } catch {
      results.italic = results.regular;
    }
  }

  return results;
}

/**
 * Load multiple font families in parallel.
 * Returns a map of { fontFamily: { regular, bold, italic } }
 */
export async function loadAllFonts(pdfDoc, fontFamilies, env) {
  const unique = [...new Set(fontFamilies)];
  const entries = await Promise.all(
    unique.map(async (family) => {
      const fonts = await loadFonts(pdfDoc, family, env);
      return [family, fonts];
    })
  );
  return Object.fromEntries(entries);
}
