/**
 * PDF generation service for book projects.
 * Uses pdf-lib to create print-ready PDFs conforming to Lulu specifications.
 *
 * Lulu specs for 8.5" x 11" (US Letter):
 * - Trim size: 8.5" x 11" (612 x 792 pt)
 * - Bleed: 0.125" (9 pt) on all sides
 * - Page size with bleed: 8.75" x 11.25" (630 x 810 pt)
 * - Safety margin: 0.5" (36 pt) from trim edge
 * - Gutter: 0.75" (54 pt) additional on spine side
 * - Spine width: depends on page count (approx 0.0025" per page for B&W)
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadAllFonts, fixCIDFontWidths } from './fonts.js';

// Dimensions in points (1 inch = 72 points)
const TRIM_WIDTH = 612;   // 8.5"
const TRIM_HEIGHT = 792;  // 11"
const BLEED = 9;          // 0.125"
const PAGE_WIDTH = TRIM_WIDTH + 2 * BLEED;   // 630 pt
const PAGE_HEIGHT = TRIM_HEIGHT + 2 * BLEED;  // 810 pt
const SAFETY_MARGIN = 36;  // 0.5"
const GUTTER = 54;         // 0.75"

// Content area (from trim edge inward)
const CONTENT_TOP = PAGE_HEIGHT - BLEED - SAFETY_MARGIN;
const CONTENT_BOTTOM = BLEED + SAFETY_MARGIN;
const CONTENT_WIDTH_RIGHT = TRIM_WIDTH - SAFETY_MARGIN - GUTTER; // content width

// Layout constants
const LEFT_X = BLEED + GUTTER + 10;
const CENTER_X = PAGE_WIDTH / 2;
const CONTENT_MAX_WIDTH = CONTENT_WIDTH_RIGHT - 20;
const RIGHT_X = LEFT_X + CONTENT_MAX_WIDTH;

// Border area (inset from page edges by bleed + small margin)
const BORDER_MARGIN = BLEED + 18;

/**
 * Wrap text to fit within a given width, returning an array of lines.
 */
function wrapText(text, font, fontSize, maxWidth) {
  // Split on explicit newlines first to preserve paragraph/line breaks
  const paragraphs = text.split(/\n/);
  const lines = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed === '') {
      lines.push(''); // Preserve blank lines as paragraph breaks
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

// ===== Decorative Drawing Helpers (US-EXPORT-8) =====

/**
 * Draw a page border around the content area.
 */
function drawPageBorder(page, styles) {
  if (styles.borderStyle === 'none') return;

  const bx = BORDER_MARGIN;
  const by = BORDER_MARGIN;
  const bw = PAGE_WIDTH - 2 * BORDER_MARGIN;
  const bh = PAGE_HEIGHT - 2 * BORDER_MARGIN;

  page.drawRectangle({
    x: bx, y: by, width: bw, height: bh,
    borderColor: styles.borderColor,
    borderWidth: 0.75,
    color: undefined,
  });

  if (styles.borderStyle === 'double') {
    const inset = 4;
    page.drawRectangle({
      x: bx + inset, y: by + inset,
      width: bw - 2 * inset, height: bh - 2 * inset,
      borderColor: styles.borderColor,
      borderWidth: 0.5,
      color: undefined,
    });
  }
}

/**
 * Draw L-shaped corner ornaments on the page.
 */
function drawCornerOrnaments(page, styles) {
  if (styles.ornamentStyle === 'none') return;

  const len = 20;
  const thickness = 1.5;
  const color = styles.ornamentColor;
  const bx = BORDER_MARGIN + 6;
  const by = BORDER_MARGIN + 6;
  const bx2 = PAGE_WIDTH - BORDER_MARGIN - 6;
  const by2 = PAGE_HEIGHT - BORDER_MARGIN - 6;

  // Top-left
  page.drawLine({ start: { x: bx, y: by2 }, end: { x: bx + len, y: by2 }, thickness, color });
  page.drawLine({ start: { x: bx, y: by2 }, end: { x: bx, y: by2 - len }, thickness, color });

  // Top-right
  page.drawLine({ start: { x: bx2, y: by2 }, end: { x: bx2 - len, y: by2 }, thickness, color });
  page.drawLine({ start: { x: bx2, y: by2 }, end: { x: bx2, y: by2 - len }, thickness, color });

  // Bottom-left
  page.drawLine({ start: { x: bx, y: by }, end: { x: bx + len, y: by }, thickness, color });
  page.drawLine({ start: { x: bx, y: by }, end: { x: bx, y: by + len }, thickness, color });

  // Bottom-right
  page.drawLine({ start: { x: bx2, y: by }, end: { x: bx2 - len, y: by }, thickness, color });
  page.drawLine({ start: { x: bx2, y: by }, end: { x: bx2, y: by + len }, thickness, color });
}

/**
 * Draw a section divider between documents.
 */
function drawSectionDivider(page, y, styles) {
  const midX = CENTER_X;
  const halfLen = CONTENT_MAX_WIDTH / 2 - 20;

  if (styles.dividerStyle === 'diamond') {
    // Line + diamond
    page.drawLine({
      start: { x: LEFT_X + 20, y },
      end: { x: midX - 8, y },
      thickness: 0.5, color: styles.lineColor,
    });
    page.drawLine({
      start: { x: midX + 8, y },
      end: { x: RIGHT_X - 20, y },
      thickness: 0.5, color: styles.lineColor,
    });
    // Diamond shape (4 lines forming a small diamond)
    const ds = 5;
    page.drawLine({ start: { x: midX, y: y + ds }, end: { x: midX + ds, y }, thickness: 0.75, color: styles.ornamentColor });
    page.drawLine({ start: { x: midX + ds, y }, end: { x: midX, y: y - ds }, thickness: 0.75, color: styles.ornamentColor });
    page.drawLine({ start: { x: midX, y: y - ds }, end: { x: midX - ds, y }, thickness: 0.75, color: styles.ornamentColor });
    page.drawLine({ start: { x: midX - ds, y }, end: { x: midX, y: y + ds }, thickness: 0.75, color: styles.ornamentColor });
  } else if (styles.dividerStyle === 'dots') {
    // Three centered dots
    const dotR = 1.5;
    for (const dx of [-10, 0, 10]) {
      page.drawCircle({
        x: midX + dx, y,
        size: dotR,
        color: styles.ornamentColor,
      });
    }
  } else {
    // Plain line
    page.drawLine({
      start: { x: LEFT_X + 40, y },
      end: { x: RIGHT_X - 40, y },
      thickness: 0.5, color: styles.lineColor,
    });
  }
}

/**
 * Draw title page decoration: accent block + ornamental rule.
 */
function drawTitlePageDecoration(page, styles) {
  if (!styles.accentColor) return;

  // Accent bar across upper portion
  page.drawRectangle({
    x: BORDER_MARGIN + 30,
    y: PAGE_HEIGHT * 0.52,
    width: PAGE_WIDTH - 2 * BORDER_MARGIN - 60,
    height: 4,
    color: styles.accentColor,
  });

  // Thin ornamental rule below title area
  page.drawRectangle({
    x: CENTER_X - 60,
    y: PAGE_HEIGHT * 0.48,
    width: 120,
    height: 1,
    color: styles.ornamentColor,
  });
}

/**
 * Draw parchment-style background tint on a page.
 */
function drawPageBackground(page, styles) {
  if (!styles.pageBgColor) return;
  page.drawRectangle({
    x: BLEED, y: BLEED,
    width: TRIM_WIDTH, height: TRIM_HEIGHT,
    color: styles.pageBgColor,
  });
}

/**
 * Render a scan image page before the document text.
 * Returns 1 (the page added).
 */
function renderScanImagePage(pdfDoc, doc, image, fonts, styles) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBackground(page, styles);
  drawPageBorder(page, styles);
  drawCornerOrnaments(page, styles);

  const maxImgWidth = CONTENT_MAX_WIDTH;
  const maxImgHeight = CONTENT_TOP - CONTENT_BOTTOM - 80; // leave room for caption
  const scaled = image.scaleToFit(maxImgWidth, maxImgHeight);

  const imgX = CENTER_X - scaled.width / 2;
  const imgY = CONTENT_BOTTOM + 60 + (maxImgHeight - scaled.height) / 2;

  page.drawImage(image, {
    x: imgX, y: imgY,
    width: scaled.width, height: scaled.height,
  });

  // Caption below image
  const captionText = `${doc.title || 'Untitled'} \u2014 Original Scan`;
  const captionWidth = fonts.italic.widthOfTextAtSize(captionText, 10);
  page.drawText(captionText, {
    x: CENTER_X - captionWidth / 2,
    y: imgY - 20,
    size: 10,
    font: fonts.italic,
    color: styles.bodyColor,
  });

  return 1;
}

/**
 * Render a single document's content, spanning multiple pages if needed.
 * Appends pages to the end of pdfDoc.
 * Returns the number of pages used.
 */
function renderDocumentPages(pdfDoc, doc, fonts, styles, isFirstDoc) {
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBackground(page, styles);
  drawPageBorder(page, styles);
  drawCornerOrnaments(page, styles);
  let y = CONTENT_TOP - 40;
  let pageCount = 1;

  // Add a continuation page when content overflows
  function ensureSpace(needed) {
    if (y < CONTENT_BOTTOM + needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageBackground(page, styles);
      drawPageBorder(page, styles);
      drawCornerOrnaments(page, styles);
      y = CONTENT_TOP - 20;
      pageCount++;
    }
  }

  // Section divider before all docs except the first
  if (!isFirstDoc) {
    // The divider was drawn at the end of the previous doc's last page or
    // we draw it at the top of this new page
    drawSectionDivider(page, CONTENT_TOP - 15, styles);
    y = CONTENT_TOP - 40;
  }

  // Document title
  const docTitleText = doc.title || 'Untitled';
  page.drawText(docTitleText, {
    x: LEFT_X,
    y,
    size: styles.docTitleFontSize,
    font: fonts.bold,
    color: styles.titleColor,
  });
  y -= styles.docTitleFontSize + 16;

  // Separator line
  page.drawLine({
    start: { x: LEFT_X, y: y + 6 },
    end: { x: LEFT_X + CONTENT_MAX_WIDTH, y: y + 6 },
    thickness: 0.5,
    color: styles.lineColor,
  });
  y -= 12;

  // Recipe: ingredients
  if (doc.type === 'recipe' && doc.ingredients && doc.ingredients.length > 0) {
    ensureSpace(40);
    page.drawText('Ingredients', {
      x: LEFT_X,
      y,
      size: 14,
      font: fonts.bold,
      color: styles.sectionColor,
    });
    y -= 20;

    for (const ing of doc.ingredients) {
      const ingText = typeof ing === 'string'
        ? `  \u2022 ${ing}`
        : `  \u2022 ${ing.amount || ''} ${ing.unit || ''} ${ing.item || ''}`.trim();
      const ingLines = wrapText(ingText, fonts.regular, 11, CONTENT_MAX_WIDTH);
      for (const line of ingLines) {
        ensureSpace(20);
        page.drawText(line, {
          x: LEFT_X + 10,
          y,
          size: 11,
          font: fonts.regular,
          color: styles.bodyColor,
        });
        y -= 15;
      }
    }
    y -= 10;
  }

  // Recipe: instructions
  if (doc.type === 'recipe' && doc.instructions && doc.instructions.length > 0) {
    ensureSpace(40);
    page.drawText('Instructions', {
      x: LEFT_X,
      y,
      size: 14,
      font: fonts.bold,
      color: styles.sectionColor,
    });
    y -= 20;

    for (let i = 0; i < doc.instructions.length; i++) {
      const stepText = `${i + 1}. ${doc.instructions[i]}`;
      const stepLines = wrapText(stepText, fonts.regular, 11, CONTENT_MAX_WIDTH - 10);
      for (const line of stepLines) {
        ensureSpace(20);
        page.drawText(line, {
          x: LEFT_X + 10,
          y,
          size: 11,
          font: fonts.regular,
          color: styles.bodyColor,
        });
        y -= 15;
      }
      y -= 5;
    }
  }

  // Non-recipe: raw content
  if (doc.type !== 'recipe' && doc.content) {
    const paragraphs = doc.content.split('\n');
    for (const para of paragraphs) {
      if (para.trim() === '') {
        y -= 10;
        continue;
      }
      const lines = wrapText(para, fonts.regular, 11, CONTENT_MAX_WIDTH);
      for (const line of lines) {
        ensureSpace(20);
        page.drawText(line, {
          x: LEFT_X,
          y,
          size: 11,
          font: fonts.regular,
          color: styles.bodyColor,
        });
        y -= 15;
      }
    }
  }

  // Notes
  if (doc.notes) {
    ensureSpace(50);
    y -= 15;
    page.drawText('Notes', {
      x: LEFT_X,
      y,
      size: 12,
      font: fonts.italic,
      color: styles.sectionColor,
    });
    y -= 16;

    const noteLines = wrapText(doc.notes, fonts.italic, 10, CONTENT_MAX_WIDTH);
    for (const line of noteLines) {
      ensureSpace(20);
      page.drawText(line, {
        x: LEFT_X + 5,
        y,
        size: 10,
        font: fonts.italic,
        color: styles.bodyColor,
      });
      y -= 14;
    }
  }

  return pageCount;
}

/**
 * Map font family name to pdf-lib StandardFonts triplet.
 */
const FONT_FAMILIES = {
  serif: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
  },
  'sans-serif': {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
  },
  monospace: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
  },
};

/**
 * Generate the interior PDF for a book project.
 *
 * Uses a two-pass approach:
 *   Pass 1: Render document pages (appended) — tracks page counts per document
 *   Pass 2: Insert front matter (title, copyright, TOC) at the beginning with correct page numbers
 *
 * @param {object} book - Book metadata (title, subtitle, author)
 * @param {object[]} documents - Array of documents with extracted data
 * @param {string|object} optionsOrTemplate - Options object or legacy template string
 * @param {object} [env] - Worker env with FONTS KV binding (optional, enables custom fonts)
 * @returns {Promise<ArrayBuffer>} The generated PDF as an ArrayBuffer
 */
export async function generateBookPdf(book, documents, optionsOrTemplate = {}, env = null) {
  // Backward compatibility: accept a string as the template name
  const opts = typeof optionsOrTemplate === 'string'
    ? { template: optionsOrTemplate }
    : (optionsOrTemplate || {});

  const {
    template = 'heritage',
    fontFamily = 'serif',
    includeTitlePage = true,
    includeCopyright = true,
    includeToc = true,
    showPageNumbers = true,
  } = opts;

  const pdfDoc = await PDFDocument.create();

  // Try to load custom fonts from KV (with subset: false to prevent character spacing issues)
  let fonts;
  if (env?.FONTS && fontFamily) {
    try {
      const customFontMap = await loadAllFonts(pdfDoc, [fontFamily], env);
      const customFonts = customFontMap[fontFamily];
      if (customFonts?.regular) {
        fonts = {
          regular: customFonts.regular,
          bold: customFonts.bold || customFonts.regular,
          italic: customFonts.italic || customFonts.regular,
        };
      }
    } catch (err) {
      console.error('Custom font loading failed, falling back to standard fonts:', err?.message || err);
    }
  }

  // Fall back to standard fonts
  if (!fonts) {
    const fontDef = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.serif;
    fonts = {
      regular: await pdfDoc.embedFont(fontDef.regular),
      bold: await pdfDoc.embedFont(fontDef.bold),
      italic: await pdfDoc.embedFont(fontDef.italic),
    };
  }

  const fontRegular = fonts.regular;
  const fontBold = fonts.bold;
  const fontItalic = fonts.italic;

  const styles = getTemplateStyles(template);

  // ===== Pass 1: Render all document pages =====
  // If documents have _imageBytes, render scan image pages first
  const docPageCounts = [];
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    let scanImagePages = 0;

    // Embed scan image page if present (US-EXPORT-9)
    if (doc._imageBytes) {
      try {
        let image;
        if (doc._mimeType === 'image/png') {
          image = await pdfDoc.embedPng(doc._imageBytes);
        } else {
          // Default to JPEG for image/jpeg and other types
          image = await pdfDoc.embedJpg(doc._imageBytes);
        }
        scanImagePages = renderScanImagePage(pdfDoc, doc, image, fonts, styles);
      } catch {
        // Graceful fallback: skip image if embedding fails
      }
    }

    const textPages = renderDocumentPages(pdfDoc, doc, fonts, styles, i === 0);
    docPageCounts.push(scanImagePages + textPages);
  }

  // ===== Pass 2: Calculate front matter sizing =====
  let frontMatterPageCount = 0;
  if (includeTitlePage) frontMatterPageCount++;
  if (includeCopyright) frontMatterPageCount++;

  let tocPageCount = 0;
  if (includeToc) {
    const tocContentHeight = (CONTENT_TOP - 80) - (CONTENT_BOTTOM + 40);
    const tocEntriesPerPage = Math.floor(tocContentHeight / 20);
    tocPageCount = Math.max(1, Math.ceil(documents.length / tocEntriesPerPage));
    frontMatterPageCount += tocPageCount;
  }

  // Calculate the 1-based page number where each document starts
  const docStartPages = [];
  let cumulative = frontMatterPageCount;
  for (const count of docPageCounts) {
    docStartPages.push(cumulative + 1); // 1-based
    cumulative += count;
  }

  // ===== Pass 3: Insert front matter pages at the beginning =====
  let insertIdx = 0;

  // --- Title Page ---
  if (includeTitlePage) {
    const titlePage = pdfDoc.insertPage(insertIdx, [PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBackground(titlePage, styles);
    drawPageBorder(titlePage, styles);
    drawTitlePageDecoration(titlePage, styles);

    // Embed cover photo if provided
    let photoBottomY = PAGE_HEIGHT * 0.62;
    if (book._coverPhotoBytes) {
      try {
        let coverImage;
        if (book._coverPhotoMimeType === 'image/png') {
          coverImage = await pdfDoc.embedPng(book._coverPhotoBytes);
        } else {
          coverImage = await pdfDoc.embedJpg(book._coverPhotoBytes);
        }
        const maxW = CONTENT_MAX_WIDTH * 0.5;
        const maxH = 180;
        const scaled = coverImage.scaleToFit(maxW, maxH);
        const imgX = CENTER_X - scaled.width / 2;
        const imgY = PAGE_HEIGHT * 0.65;
        titlePage.drawImage(coverImage, {
          x: imgX, y: imgY,
          width: scaled.width, height: scaled.height,
        });
        photoBottomY = imgY - 20;
      } catch {
        // Skip if image embedding fails
      }
    }

    const titleFontSize = styles.titleFontSize;
    const titleText = book.title || 'Untitled';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleFontSize);
    const titleY = book._coverPhotoBytes ? photoBottomY : PAGE_HEIGHT * 0.6;
    titlePage.drawText(titleText, {
      x: CENTER_X - titleWidth / 2,
      y: titleY,
      size: titleFontSize,
      font: fontBold,
      color: styles.titleColor,
    });

    if (book.subtitle) {
      const subtitleSize = styles.subtitleFontSize;
      const subtitleWidth = fontItalic.widthOfTextAtSize(book.subtitle, subtitleSize);
      titlePage.drawText(book.subtitle, {
        x: CENTER_X - subtitleWidth / 2,
        y: titleY - titleFontSize - 20,
        size: subtitleSize,
        font: fontItalic,
        color: styles.subtitleColor,
      });
    }

    if (book.author) {
      const authorSize = styles.authorFontSize;
      const authorWidth = fontRegular.widthOfTextAtSize(book.author, authorSize);
      titlePage.drawText(book.author, {
        x: CENTER_X - authorWidth / 2,
        y: PAGE_HEIGHT * 0.35,
        size: authorSize,
        font: fontRegular,
        color: styles.bodyColor,
      });
    }
    insertIdx++;
  }

  // --- Copyright Page ---
  if (includeCopyright) {
    const copyrightPage = pdfDoc.insertPage(insertIdx, [PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBackground(copyrightPage, styles);

    const copyrightText = [
      `${book.title || 'Untitled'}`,
      '',
      book.author ? `By ${book.author}` : '',
      '',
      `Copyright ${new Date().getFullYear()}${book.author ? ` ${book.author}` : ''}`,
      'All rights reserved.',
      '',
      'Created with KeptPages',
    ].filter(Boolean);

    let copyrightY = CONTENT_TOP - 200;
    for (const line of copyrightText) {
      if (line === '') {
        copyrightY -= 14;
        continue;
      }
      copyrightPage.drawText(line, {
        x: LEFT_X,
        y: copyrightY,
        size: 10,
        font: fontRegular,
        color: styles.bodyColor,
      });
      copyrightY -= 14;
    }
    insertIdx++;
  }

  // --- Table of Contents ---
  if (includeToc) {
    let tocEntryIndex = 0;
    for (let tp = 0; tp < tocPageCount; tp++) {
      const tocPage = pdfDoc.insertPage(insertIdx + tp, [PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageBackground(tocPage, styles);
      drawPageBorder(tocPage, styles);

      let tocY;
      if (tp === 0) {
        const tocTitle = 'Table of Contents';
        const tocTitleWidth = fontBold.widthOfTextAtSize(tocTitle, 24);
        tocPage.drawText(tocTitle, {
          x: CENTER_X - tocTitleWidth / 2,
          y: CONTENT_TOP - 40,
          size: 24,
          font: fontBold,
          color: styles.titleColor,
        });
        tocY = CONTENT_TOP - 80;
      } else {
        tocY = CONTENT_TOP - 40;
      }

      while (tocEntryIndex < documents.length && tocY >= CONTENT_BOTTOM + 40) {
        const doc = documents[tocEntryIndex];
        const docTitle = doc.title || `Document ${tocEntryIndex + 1}`;
        const pageNum = String(docStartPages[tocEntryIndex]);

        let displayTitle = docTitle;
        const maxTitleWidth = CONTENT_MAX_WIDTH - 40;
        while (fontRegular.widthOfTextAtSize(displayTitle, 12) > maxTitleWidth && displayTitle.length > 3) {
          displayTitle = displayTitle.slice(0, -4) + '...';
        }

        tocPage.drawText(displayTitle, {
          x: LEFT_X,
          y: tocY,
          size: 12,
          font: fontRegular,
          color: styles.bodyColor,
        });

        const pageNumWidth = fontRegular.widthOfTextAtSize(pageNum, 12);
        tocPage.drawText(pageNum, {
          x: PAGE_WIDTH - BLEED - SAFETY_MARGIN - pageNumWidth,
          y: tocY,
          size: 12,
          font: fontRegular,
          color: styles.bodyColor,
        });

        const titleEnd = LEFT_X + fontRegular.widthOfTextAtSize(displayTitle, 12) + 8;
        const dotsEnd = PAGE_WIDTH - BLEED - SAFETY_MARGIN - pageNumWidth - 8;
        if (dotsEnd > titleEnd + 20) {
          let dotX = titleEnd;
          while (dotX < dotsEnd) {
            tocPage.drawText('.', {
              x: dotX,
              y: tocY,
              size: 10,
              font: fontRegular,
              color: styles.lineColor,
            });
            dotX += 6;
          }
        }

        tocY -= 20;
        tocEntryIndex++;
      }
    }
  }

  // ===== Page numbers =====
  if (showPageNumbers) {
    const totalPages = pdfDoc.getPageCount();
    for (let i = frontMatterPageCount; i < totalPages; i++) {
      const pg = pdfDoc.getPage(i);
      const num = String(i + 1);
      const numWidth = fontRegular.widthOfTextAtSize(num, 9);
      pg.drawText(num, {
        x: CENTER_X - numWidth / 2,
        y: BLEED + SAFETY_MARGIN / 2,
        size: 9,
        font: fontRegular,
        color: styles.bodyColor,
      });
    }
  }

  const pdfBytes = await fixCIDFontWidths(pdfDoc);
  return { buffer: pdfBytes.buffer || pdfBytes, pageCount: pdfDoc.getPageCount() };
}

/**
 * Cover color scheme definitions matching the frontend designer.
 */
const COVER_SCHEMES = {
  default:  { bg: [0.98, 0.96, 0.91], accent: [0.78, 0.36, 0.24], text: [0.25, 0.17, 0.10], textSub: [0.50, 0.40, 0.35] },
  midnight: { bg: [0.10, 0.10, 0.18], accent: [0.89, 0.69, 0.29], text: [1, 1, 1],          textSub: [0.85, 0.85, 0.90] },
  forest:   { bg: [0.94, 0.96, 0.94], accent: [0.18, 0.35, 0.24], text: [0.15, 0.25, 0.15], textSub: [0.30, 0.45, 0.30] },
  plum:     { bg: [0.97, 0.94, 0.96], accent: [0.48, 0.25, 0.43], text: [0.30, 0.15, 0.27], textSub: [0.50, 0.35, 0.47] },
  ocean:    { bg: [0.93, 0.96, 0.97], accent: [0.16, 0.39, 0.59], text: [0.12, 0.22, 0.35], textSub: [0.30, 0.42, 0.55] },
};

function getCoverColorScheme(schemeId) {
  return COVER_SCHEMES[schemeId] || COVER_SCHEMES.default;
}

/**
 * Generate a cover PDF for a book.
 * Cover dimensions depend on page count (affects spine width).
 *
 * @param {object} coverData - { title, subtitle, author, colorScheme, layout, photoBytes, photoMimeType, fontFamily }
 * @param {number} pageCount - Total interior page count
 * @param {object|null} env - Worker env for loading custom fonts (null for legacy/standard fonts)
 * @returns {Promise<ArrayBuffer>}
 */
export async function generateCoverPdf(coverData, pageCount, env) {
  const pdfDoc = await PDFDocument.create();

  // Calculate spine width: approximately 0.0025" per page for B&W, 0.002252" per page for color
  const spineWidthInches = pageCount * 0.0025;
  const spineWidthPt = spineWidthInches * 72;

  // Cover dimensions: back + spine + front, with bleed
  const coverBleed = 9; // 0.125"
  const coverWidth = (TRIM_WIDTH * 2) + spineWidthPt + (2 * coverBleed);
  const coverHeight = TRIM_HEIGHT + (2 * coverBleed);

  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);

  // Load custom fonts for the cover if a font family and env are provided
  let fontBold, fontItalic, fontRegular;
  if (coverData.fontFamily && env) {
    try {
      const coverFontMap = await loadAllFonts(pdfDoc, [coverData.fontFamily], env);
      const customFonts = coverFontMap[coverData.fontFamily];
      if (customFonts) {
        fontBold = customFonts.bold || customFonts.regular;
        fontItalic = customFonts.italic || customFonts.regular;
        fontRegular = customFonts.regular;
      }
    } catch (err) {
      console.error('Cover font loading failed, using standard fonts:', err?.message || err);
    }
  }
  // Fall back to standard fonts
  if (!fontBold) fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  if (!fontItalic) fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  if (!fontRegular) fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const scheme = getCoverColorScheme(coverData.colorScheme);
  const bgColor = rgb(...scheme.bg);
  const textColor = rgb(...scheme.text);
  const textSubColor = rgb(...scheme.textSub);

  const layout = coverData.layout || 'centered';
  const titleText = coverData.title || 'Untitled';

  // Front cover area starts after back cover + spine
  const frontCoverX = TRIM_WIDTH + coverBleed + spineWidthPt;
  const frontCenterX = frontCoverX + TRIM_WIDTH / 2;

  // Background
  coverPage.drawRectangle({
    x: 0, y: 0, width: coverWidth, height: coverHeight,
    color: bgColor,
  });

  // For photo-background layout, embed cover photo as full-bleed front cover
  if (layout === 'photo-background' && coverData.photoBytes) {
    try {
      const embedFn = coverData.photoMimeType === 'image/png' ? 'embedPng' : 'embedJpg';
      const photo = await pdfDoc[embedFn](coverData.photoBytes);
      const photoDims = photo.scaleToFit(TRIM_WIDTH + coverBleed, coverHeight);
      coverPage.drawImage(photo, {
        x: frontCoverX,
        y: (coverHeight - photoDims.height) / 2,
        width: photoDims.width,
        height: photoDims.height,
      });
      // Dark overlay for text readability
      coverPage.drawRectangle({
        x: frontCoverX, y: 0, width: TRIM_WIDTH + coverBleed, height: coverHeight,
        color: rgb(0, 0, 0), opacity: 0.45,
      });
    } catch (err) {
      console.error('Cover photo embed failed:', err?.message || err);
    }
  }

  // Text colors for photo-background are always white for readability
  const frontTextColor = layout === 'photo-background' && coverData.photoBytes ? rgb(1, 1, 1) : textColor;
  const frontSubColor = layout === 'photo-background' && coverData.photoBytes ? rgb(0.9, 0.9, 0.95) : textSubColor;

  // Title
  const titleSize = 36;
  if (layout === 'left-aligned') {
    const leftPad = frontCoverX + 50;
    coverPage.drawText(titleText, {
      x: leftPad, y: coverHeight * 0.6,
      size: titleSize, font: fontBold, color: frontTextColor,
    });
    if (coverData.subtitle) {
      coverPage.drawText(coverData.subtitle, {
        x: leftPad, y: coverHeight * 0.6 - titleSize - 20,
        size: 18, font: fontItalic, color: frontSubColor,
      });
    }
    if (coverData.author) {
      coverPage.drawText(coverData.author, {
        x: leftPad, y: coverBleed + 60,
        size: 16, font: fontRegular, color: frontSubColor,
      });
    }
    // Cover photo for left-aligned layout (below author)
    if (coverData.photoBytes && layout !== 'photo-background') {
      try {
        const embedFn = coverData.photoMimeType === 'image/png' ? 'embedPng' : 'embedJpg';
        const photo = await pdfDoc[embedFn](coverData.photoBytes);
        const maxW = TRIM_WIDTH * 0.6;
        const maxH = coverHeight * 0.25;
        const photoDims = photo.scaleToFit(maxW, maxH);
        coverPage.drawImage(photo, {
          x: leftPad,
          y: coverBleed + 90,
          width: photoDims.width,
          height: photoDims.height,
        });
      } catch (err) {
        console.error('Cover photo embed failed (left-aligned):', err?.message || err);
      }
    }
  } else {
    // centered (and photo-background) layout
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
    coverPage.drawText(titleText, {
      x: frontCenterX - titleWidth / 2, y: coverHeight * 0.6,
      size: titleSize, font: fontBold, color: frontTextColor,
    });
    if (coverData.subtitle) {
      const subtitleSize = 18;
      const subtitleWidth = fontItalic.widthOfTextAtSize(coverData.subtitle, subtitleSize);
      coverPage.drawText(coverData.subtitle, {
        x: frontCenterX - subtitleWidth / 2, y: coverHeight * 0.6 - titleSize - 20,
        size: subtitleSize, font: fontItalic, color: frontSubColor,
      });
    }
    if (coverData.author) {
      const authorSize = 16;
      const authorWidth = fontRegular.widthOfTextAtSize(coverData.author, authorSize);
      coverPage.drawText(coverData.author, {
        x: frontCenterX - authorWidth / 2, y: coverHeight * 0.3,
        size: authorSize, font: fontRegular, color: frontSubColor,
      });
    }
    // Cover photo for centered layout (between author and bottom)
    if (coverData.photoBytes && layout !== 'photo-background') {
      try {
        const embedFn = coverData.photoMimeType === 'image/png' ? 'embedPng' : 'embedJpg';
        const photo = await pdfDoc[embedFn](coverData.photoBytes);
        const maxW = TRIM_WIDTH * 0.5;
        const maxH = coverHeight * 0.2;
        const photoDims = photo.scaleToFit(maxW, maxH);
        coverPage.drawImage(photo, {
          x: frontCenterX - photoDims.width / 2,
          y: coverBleed + 60,
          width: photoDims.width,
          height: photoDims.height,
        });
      } catch (err) {
        console.error('Cover photo embed failed (centered):', err?.message || err);
      }
    }
  }

  // Spine text
  if (spineWidthPt > 20) {
    const spineX = coverBleed + TRIM_WIDTH + spineWidthPt / 2;
    const spineFontSize = Math.min(10, spineWidthPt * 0.6);
    const spineTextColor = layout === 'photo-background' && coverData.photoBytes ? rgb(1, 1, 1) : textColor;
    coverPage.drawText(titleText.substring(0, 30), {
      x: spineX - spineFontSize / 2, y: coverHeight / 2,
      size: spineFontSize, font: fontBold, color: spineTextColor,
    });
  }

  // Back cover - "Created with KeptPages"
  const backCenterX = coverBleed + TRIM_WIDTH / 2;
  const backText = 'Created with KeptPages';
  const backTextWidth = fontRegular.widthOfTextAtSize(backText, 12);
  coverPage.drawText(backText, {
    x: backCenterX - backTextWidth / 2, y: coverBleed + 40,
    size: 12, font: fontRegular, color: textSubColor,
  });

  const pdfBytes = await fixCIDFontWidths(pdfDoc);
  return pdfBytes.buffer || pdfBytes;
}

/**
 * Get template-specific styles for the 5 color themes.
 * Legacy template names ('classic', 'modern', 'minimal') map to new themes for backward compatibility.
 */
function getTemplateStyles(template) {
  // Map legacy template names to new themes
  const themeMap = {
    classic: 'heritage',
    modern: 'modern',
    minimal: 'parchment',
  };
  const theme = themeMap[template] || template;

  switch (theme) {
    case 'garden':
      return {
        titleFontSize: 32,
        subtitleFontSize: 16,
        authorFontSize: 14,
        docTitleFontSize: 18,
        titleColor: rgb(0.26, 0.38, 0.24),       // sage green
        subtitleColor: rgb(0.44, 0.36, 0.28),     // warm brown
        sectionColor: rgb(0.30, 0.42, 0.28),      // forest green
        bodyColor: rgb(0.15, 0.15, 0.12),
        lineColor: rgb(0.62, 0.56, 0.46),         // earthy tan
        accentColor: rgb(0.55, 0.68, 0.42),       // fresh green
        borderColor: rgb(0.62, 0.56, 0.46),
        ornamentColor: rgb(0.44, 0.36, 0.28),
        pageBgColor: null,
        borderStyle: 'single',
        dividerStyle: 'dots',
        ornamentStyle: 'corners',
      };

    case 'heirloom':
      return {
        titleFontSize: 34,
        subtitleFontSize: 16,
        authorFontSize: 14,
        docTitleFontSize: 18,
        titleColor: rgb(0.12, 0.16, 0.32),        // navy
        subtitleColor: rgb(0.35, 0.35, 0.50),
        sectionColor: rgb(0.15, 0.20, 0.38),
        bodyColor: rgb(0.10, 0.10, 0.12),
        lineColor: rgb(0.70, 0.65, 0.45),         // gold
        accentColor: rgb(0.75, 0.63, 0.22),       // rich gold
        borderColor: rgb(0.12, 0.16, 0.32),
        ornamentColor: rgb(0.75, 0.63, 0.22),
        pageBgColor: null,
        borderStyle: 'double',
        dividerStyle: 'diamond',
        ornamentStyle: 'corners',
      };

    case 'parchment':
      return {
        titleFontSize: 30,
        subtitleFontSize: 15,
        authorFontSize: 13,
        docTitleFontSize: 17,
        titleColor: rgb(0.40, 0.28, 0.12),        // dark sepia
        subtitleColor: rgb(0.52, 0.40, 0.24),
        sectionColor: rgb(0.45, 0.32, 0.15),
        bodyColor: rgb(0.22, 0.18, 0.12),
        lineColor: rgb(0.72, 0.62, 0.44),         // amber
        accentColor: rgb(0.68, 0.52, 0.24),       // warm amber
        borderColor: rgb(0.60, 0.50, 0.34),
        ornamentColor: rgb(0.55, 0.42, 0.22),
        pageBgColor: rgb(0.97, 0.95, 0.90),       // light parchment tint
        borderStyle: 'single',
        dividerStyle: 'diamond',
        ornamentStyle: 'corners',
      };

    case 'modern':
      return {
        titleFontSize: 36,
        subtitleFontSize: 18,
        authorFontSize: 14,
        docTitleFontSize: 20,
        titleColor: rgb(0.08, 0.08, 0.08),        // near black
        subtitleColor: rgb(0.30, 0.30, 0.30),
        sectionColor: rgb(0.15, 0.15, 0.15),
        bodyColor: rgb(0.12, 0.12, 0.12),
        lineColor: rgb(0.78, 0.78, 0.78),
        accentColor: rgb(0.76, 0.38, 0.22),       // terracotta accent
        borderColor: rgb(0.85, 0.85, 0.85),
        ornamentColor: rgb(0.76, 0.38, 0.22),
        pageBgColor: null,
        borderStyle: 'none',
        dividerStyle: 'line',
        ornamentStyle: 'none',
      };

    case 'heritage':
    default:
      return {
        titleFontSize: 32,
        subtitleFontSize: 16,
        authorFontSize: 14,
        docTitleFontSize: 18,
        titleColor: rgb(0.45, 0.22, 0.10),        // warm terracotta
        subtitleColor: rgb(0.55, 0.38, 0.22),
        sectionColor: rgb(0.50, 0.28, 0.14),
        bodyColor: rgb(0.12, 0.10, 0.08),
        lineColor: rgb(0.72, 0.58, 0.38),         // warm gold
        accentColor: rgb(0.76, 0.55, 0.22),       // gold
        borderColor: rgb(0.60, 0.45, 0.28),
        ornamentColor: rgb(0.76, 0.55, 0.22),
        pageBgColor: null,
        borderStyle: 'single',
        dividerStyle: 'diamond',
        ornamentStyle: 'corners',
      };
  }
}

// ===== Blueprint-Driven PDF Rendering (US-BOOK-10) =====

/**
 * Convert normalized coordinates (0-1) to PDF page coordinates.
 * Canvas: origin at top-left, Y goes down.
 * PDF: origin at bottom-left, Y goes up.
 * Accounts for bleed margins.
 */
function toPageCoords(normX, normY, normW, normH) {
  const x = BLEED + normX * TRIM_WIDTH;
  const y = BLEED + TRIM_HEIGHT - (normY + normH) * TRIM_HEIGHT; // flip Y
  const w = normW * TRIM_WIDTH;
  const h = normH * TRIM_HEIGHT;
  return { x, y, w, h };
}

/**
 * Parse hex color to pdf-lib rgb.
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return rgb(0.1, 0.1, 0.1);
  let clean = hex.replace('#', '');
  // Expand 3-char hex to 6-char
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (clean.length !== 6) return rgb(0.1, 0.1, 0.1);
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Get the appropriate font for an element.
 */
function resolveElementFont(element, fontMap, globalFontFamily) {
  const family = element.fontFamily || globalFontFamily || 'fraunces';
  const fonts = fontMap[family] || fontMap[globalFontFamily] || Object.values(fontMap)[0];
  if (!fonts) return null;

  if (element.fontWeight === 'bold') return fonts.bold || fonts.regular;
  if (element.fontStyle === 'italic') return fonts.italic || fonts.regular;
  return fonts.regular;
}

/**
 * Draw a positioned text element on a PDF page.
 */
function drawBlueprintText(page, element, fontMap, globalFontFamily) {
  const { x, y, w, h } = toPageCoords(element.x, element.y, element.width, element.height);
  const font = resolveElementFont(element, fontMap, globalFontFamily);
  if (!font) return;

  const text = element.text || '';
  const fontSize = element.fontSize || 14;
  const color = hexToRgb(element.color);
  const alignment = element.alignment || 'left';

  // Wrap text within the element width
  const lines = wrapText(text, font, fontSize, w);
  const lineHeight = fontSize * 1.5;

  let textY = y + h - fontSize; // start from top of element (PDF coords)

  for (const line of lines) {
    if (textY < y) break; // Don't draw below element bounds

    if (line === '') {
      // Blank line = paragraph break, add half-line spacing
      textY -= lineHeight * 0.5;
      continue;
    }

    let textX = x;
    if (alignment === 'center') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      textX = x + (w - lineWidth) / 2;
    } else if (alignment === 'right') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      textX = x + w - lineWidth;
    }

    page.drawText(line, {
      x: textX,
      y: textY,
      size: fontSize,
      font,
      color,
    });

    textY -= lineHeight;
  }
}

/**
 * Draw a positioned image element on a PDF page.
 */
async function drawBlueprintImage(page, element, imageMap, pdfDoc) {
  const { x, y, w, h } = toPageCoords(element.x, element.y, element.width, element.height);

  const imageKey = element.imageKey;
  if (!imageKey || !imageMap[imageKey]) {
    // Draw placeholder
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.94, 0.92, 0.89), borderColor: rgb(0.82, 0.78, 0.72), borderWidth: 0.5 });
    return;
  }

  const imageData = imageMap[imageKey];
  let embeddedImage;
  try {
    if (imageData.mimeType === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(imageData.bytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageData.bytes);
    }
  } catch {
    // Skip images that fail to embed
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.94, 0.92, 0.89) });
    return;
  }

  // Scale image to fit within element bounds, maintaining aspect ratio
  const scaled = embeddedImage.scaleToFit(w, h);
  const imgX = x + (w - scaled.width) / 2;
  const imgY = y + (h - scaled.height) / 2;

  // Draw frame first if needed
  if (element.frameStyle && element.frameStyle !== 'none') {
    drawPhotoFrame(page, imgX, imgY, scaled.width, scaled.height, element.frameStyle, element.frameColor);
  }

  page.drawImage(embeddedImage, {
    x: imgX,
    y: imgY,
    width: scaled.width,
    height: scaled.height,
  });
}

/**
 * Draw a positioned shape element on a PDF page.
 */
function drawBlueprintShape(page, element) {
  const { x, y, w, h } = toPageCoords(element.x, element.y, element.width, element.height);
  const stroke = hexToRgb(element.stroke);
  const strokeWidth = element.strokeWidth || 1;
  const fill = element.fill && element.fill !== 'transparent' ? hexToRgb(element.fill) : undefined;

  if (element.shapeType === 'circle') {
    const radius = Math.min(w, h) / 2;
    page.drawCircle({
      x: x + w / 2,
      y: y + h / 2,
      size: radius,
      borderColor: stroke,
      borderWidth: strokeWidth,
      color: fill,
    });
  } else {
    // Rectangle
    page.drawRectangle({
      x, y, width: w, height: h,
      borderColor: stroke,
      borderWidth: strokeWidth,
      color: fill,
    });
  }
}

/**
 * Draw a decorative element (line/divider) on a PDF page.
 */
function drawBlueprintDecorative(page, element) {
  const { x, y, w, h } = toPageCoords(element.x, element.y, element.width, element.height);
  const stroke = hexToRgb(element.stroke);
  const strokeWidth = element.strokeWidth || 1;

  page.drawLine({
    start: { x, y: y + h / 2 },
    end: { x: x + w, y: y + h / 2 },
    thickness: strokeWidth,
    color: stroke,
  });
}

/**
 * Draw texture background on a PDF page.
 */
function drawTextureBackground(page, background) {
  if (!background) return;

  const color = hexToRgb(background.color || '#ffffff');
  page.drawRectangle({ x: BLEED, y: BLEED, width: TRIM_WIDTH, height: TRIM_HEIGHT, color });

  if (background.type !== 'texture' || !background.texture) return;

  const texture = background.texture;

  if (texture === 'parchment') {
    page.drawRectangle({
      x: BLEED, y: BLEED, width: TRIM_WIDTH, height: TRIM_HEIGHT,
      color: rgb(0.97, 0.95, 0.89), opacity: 0.3,
    });
  } else if (texture === 'linen') {
    // Thin horizontal lines
    for (let ly = BLEED; ly < BLEED + TRIM_HEIGHT; ly += 8) {
      page.drawLine({
        start: { x: BLEED, y: ly },
        end: { x: BLEED + TRIM_WIDTH, y: ly },
        thickness: 0.3,
        color: rgb(0.55, 0.49, 0.42),
        opacity: 0.1,
      });
    }
  } else if (texture === 'paper-grain') {
    // Scattered dots — max 200 for performance
    const seed = 42;
    for (let i = 0; i < 200; i++) {
      const px = BLEED + ((seed * (i + 1) * 7919) % 10000) / 10000 * TRIM_WIDTH;
      const py = BLEED + ((seed * (i + 1) * 104729) % 10000) / 10000 * TRIM_HEIGHT;
      const r = ((seed * (i + 1) * 6571) % 10) / 10 + 0.3;
      page.drawCircle({
        x: px, y: py, size: r,
        color: rgb(0.55, 0.49, 0.42),
        opacity: 0.06,
      });
    }
  } else if (texture === 'watercolor-wash') {
    // Soft graduated rectangles
    for (let i = 0; i < 8; i++) {
      const inset = (i / 8) * Math.min(TRIM_WIDTH, TRIM_HEIGHT) * 0.3;
      page.drawRectangle({
        x: BLEED + inset, y: BLEED + inset,
        width: TRIM_WIDTH - inset * 2, height: TRIM_HEIGHT - inset * 2,
        color: rgb(0.83, 0.77, 0.66),
        opacity: 0.03,
      });
    }
  }
}

/**
 * Draw a photo frame around an image position in the PDF.
 */
function drawPhotoFrame(page, x, y, w, h, frameStyle, frameColor) {
  const color = frameColor ? hexToRgb(frameColor) : rgb(0.17, 0.09, 0.06);

  switch (frameStyle) {
    case 'simple':
      page.drawRectangle({ x: x - 1, y: y - 1, width: w + 2, height: h + 2, borderColor: color, borderWidth: 1 });
      break;

    case 'double':
      page.drawRectangle({ x: x - 1, y: y - 1, width: w + 2, height: h + 2, borderColor: color, borderWidth: 1 });
      page.drawRectangle({ x: x - 5, y: y - 5, width: w + 10, height: h + 10, borderColor: color, borderWidth: 1 });
      break;

    case 'ornate':
      page.drawRectangle({ x: x - 3, y: y - 3, width: w + 6, height: h + 6, borderColor: rgb(0.76, 0.53, 0.12), borderWidth: 2 });
      // Corner accents
      const cs = 10;
      for (const [cx, cy] of [[x - 3, y - 3], [x + w + 3, y - 3], [x - 3, y + h + 3], [x + w + 3, y + h + 3]]) {
        page.drawLine({ start: { x: cx - cs / 2, y: cy }, end: { x: cx + cs / 2, y: cy }, thickness: 1.5, color: rgb(0.76, 0.53, 0.12) });
      }
      break;

    case 'polaroid':
      page.drawRectangle({ x: x - 8, y: y - 30, width: w + 16, height: h + 38, color: rgb(1, 1, 1), borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.5 });
      break;

    case 'shadow':
      page.drawRectangle({ x: x + 3, y: y - 3, width: w, height: h, color: rgb(0, 0, 0), opacity: 0.12 });
      break;
  }
}

/**
 * Render a complete book from a blueprint JSON.
 * This is the main entry point for blueprint-based PDF generation.
 *
 * @param {PDFDocument} pdfDoc - The pdf-lib document
 * @param {object} blueprint - The blueprint JSON from books.customization
 * @param {Array} documents - Collection document data for document pages
 * @param {object} imageMap - Map of imageKey → { bytes, mimeType }
 * @param {object} fontMap - Map of fontFamily → { regular, bold, italic }
 * @param {object|null} coverPhotoData - { bytes, mimeType } or null
 * @returns {Promise<number>} Number of pages rendered
 */
export async function renderBlueprintBook(pdfDoc, blueprint, documents, imageMap, fontMap, coverPhotoData) {
  const { globalSettings, pages } = blueprint;
  const styles = getTemplateStyles(globalSettings?.template || 'heritage');
  const globalFont = globalSettings?.fontFamily || 'fraunces';
  let totalPages = 0;

  // Front matter
  if (globalSettings?.includeTitlePage) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBackground(page, styles);
    drawPageBorder(page, styles);
    drawTitlePageDecoration(page, styles);

    const titleFont = fontMap[globalFont]?.bold || fontMap[globalFont]?.regular;
    if (titleFont && blueprint.coverDesign?.title) {
      const titleText = blueprint.coverDesign.title;
      const titleSize = styles.titleFontSize;
      const titleWidth = titleFont.widthOfTextAtSize(titleText, titleSize);
      page.drawText(titleText, {
        x: CENTER_X - titleWidth / 2,
        y: PAGE_HEIGHT * 0.6,
        size: titleSize,
        font: titleFont,
        color: styles.titleColor,
      });
    }

    if (fontMap[globalFont]?.italic && blueprint.coverDesign?.subtitle) {
      const subFont = fontMap[globalFont].italic;
      const subText = blueprint.coverDesign.subtitle;
      const subSize = styles.subtitleFontSize;
      const subWidth = subFont.widthOfTextAtSize(subText, subSize);
      page.drawText(subText, {
        x: CENTER_X - subWidth / 2,
        y: PAGE_HEIGHT * 0.55,
        size: subSize,
        font: subFont,
        color: styles.subtitleColor,
      });
    }

    // Author on title page
    if (blueprint.coverDesign?.author) {
      const authorFont = fontMap[globalFont]?.regular;
      if (authorFont) {
        const authorText = blueprint.coverDesign.author;
        const authorSize = styles.authorFontSize || 14;
        const authorWidth = authorFont.widthOfTextAtSize(authorText, authorSize);
        page.drawText(authorText, {
          x: CENTER_X - authorWidth / 2,
          y: PAGE_HEIGHT * 0.48,
          size: authorSize,
          font: authorFont,
          color: styles.subtitleColor,
        });
      }
    }

    // Cover photo on title page (if not using photo-background layout on cover)
    if (coverPhotoData?.bytes && blueprint.coverDesign?.layout !== 'photo-background') {
      try {
        const embedFn = coverPhotoData.mimeType === 'image/png' ? 'embedPng' : 'embedJpg';
        const photo = await pdfDoc[embedFn](coverPhotoData.bytes);
        const maxPhotoWidth = TRIM_WIDTH * 0.5;
        const maxPhotoHeight = PAGE_HEIGHT * 0.3;
        const photoDims = photo.scaleToFit(maxPhotoWidth, maxPhotoHeight);
        page.drawImage(photo, {
          x: CENTER_X - photoDims.width / 2,
          y: PAGE_HEIGHT * 0.15,
          width: photoDims.width,
          height: photoDims.height,
        });
      } catch (err) {
        console.error('Title page photo embed failed:', err?.message || err);
      }
    }

    totalPages++;
  }

  if (globalSettings?.includeCopyright) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBackground(page, styles);
    const copyrightFont = fontMap[globalFont]?.regular;
    if (copyrightFont) {
      const year = new Date().getFullYear();
      const lines = [
        `Copyright \u00A9 ${year}`,
        '',
        'All rights reserved.',
        'Printed in the United States of America.',
        '',
        'Created with KeptPages',
        'keptpages.com',
      ];
      let ly = PAGE_HEIGHT * 0.45;
      for (const line of lines) {
        if (line) {
          const lw = copyrightFont.widthOfTextAtSize(line, 10);
          page.drawText(line, { x: CENTER_X - lw / 2, y: ly, size: 10, font: copyrightFont, color: styles.bodyColor });
        }
        ly -= 16;
      }
    }
    totalPages++;
  }

  if (globalSettings?.includeToc && pages.length > 0) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBackground(page, styles);
    drawPageBorder(page, styles);
    const tocFont = fontMap[globalFont]?.bold || fontMap[globalFont]?.regular;
    const tocBodyFont = fontMap[globalFont]?.regular;

    if (tocFont) {
      const tocTitle = 'Contents';
      const ttw = tocFont.widthOfTextAtSize(tocTitle, 24);
      page.drawText(tocTitle, { x: CENTER_X - ttw / 2, y: CONTENT_TOP - 40, size: 24, font: tocFont, color: styles.titleColor });
    }

    if (tocBodyFont) {
      let ly = CONTENT_TOP - 80;
      const frontMatterCount = (globalSettings.includeTitlePage ? 1 : 0) + (globalSettings.includeCopyright ? 1 : 0) + 1; // +1 for TOC itself
      pages.forEach((bp, i) => {
        if (ly < CONTENT_BOTTOM) return;
        const title = getPageTitle(bp, documents);
        const pageNum = frontMatterCount + i + 1;
        page.drawText(title, { x: LEFT_X, y: ly, size: 11, font: tocBodyFont, color: styles.bodyColor });
        const numStr = `${pageNum}`;
        const numW = tocBodyFont.widthOfTextAtSize(numStr, 11);
        page.drawText(numStr, { x: RIGHT_X - numW, y: ly, size: 11, font: tocBodyFont, color: styles.bodyColor });
        ly -= 20;
      });
    }
    totalPages++;
  }

  // Render each blueprint page
  for (const blueprintPage of pages) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Draw background
    drawTextureBackground(page, blueprintPage.background);

    // Optionally draw template decorations
    drawPageBorder(page, styles);
    drawCornerOrnaments(page, styles);

    // Render each element
    for (const element of blueprintPage.elements || []) {
      switch (element.type) {
        case 'text':
          drawBlueprintText(page, element, fontMap, globalFont);
          break;
        case 'image':
          await drawBlueprintImage(page, element, imageMap, pdfDoc);
          break;
        case 'shape':
          drawBlueprintShape(page, element);
          break;
        case 'decorative':
          drawBlueprintDecorative(page, element);
          break;
      }
    }

    // Page number
    if (globalSettings?.showPageNumbers) {
      const pageNum = totalPages + 1;
      const numFont = fontMap[globalFont]?.regular;
      if (numFont) {
        const numStr = `${pageNum}`;
        const numW = numFont.widthOfTextAtSize(numStr, 9);
        page.drawText(numStr, {
          x: CENTER_X - numW / 2,
          y: BLEED + 18,
          size: 9,
          font: numFont,
          color: styles.bodyColor,
        });
      }
    }

    totalPages++;
  }

  return totalPages;
}

/**
 * Get a display title for a blueprint page (for TOC).
 */
function getPageTitle(blueprintPage, documents) {
  // Find the first text element that looks like a title
  const titleEl = blueprintPage.elements?.find((el) =>
    el.type === 'text' && (el.fontWeight === 'bold' || el.fontSize >= 20)
  );
  if (titleEl?.text) return titleEl.text;

  // For document pages, use the document title
  if (blueprintPage.documentId) {
    const doc = documents?.find((d) => d.id === blueprintPage.documentId);
    if (doc?.title) return doc.title;
  }

  // Page kind label
  const kindLabels = {
    'document': 'Document',
    'custom-text': 'Custom Text',
    'photo': 'Photo',
    'photo-collage': 'Photo Collage',
    'section-divider': 'Section',
    'dedication': 'Dedication',
    'blank': 'Blank Page',
  };
  return kindLabels[blueprintPage.kind] || 'Page';
}
