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

/**
 * Wrap text to fit within a given width, returning an array of lines.
 */
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
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

  return lines;
}

/**
 * Render a single document's content, spanning multiple pages if needed.
 * Appends pages to the end of pdfDoc.
 * Returns the number of pages used.
 */
function renderDocumentPages(pdfDoc, doc, fonts, styles) {
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = CONTENT_TOP - 40;
  let pageCount = 1;

  // Add a continuation page when content overflows
  function ensureSpace(needed) {
    if (y < CONTENT_BOTTOM + needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = CONTENT_TOP - 20;
      pageCount++;
    }
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
 * @returns {Promise<ArrayBuffer>} The generated PDF as an ArrayBuffer
 */
export async function generateBookPdf(book, documents, optionsOrTemplate = {}) {
  // Backward compatibility: accept a string as the template name
  const opts = typeof optionsOrTemplate === 'string'
    ? { template: optionsOrTemplate }
    : (optionsOrTemplate || {});

  const {
    template = 'classic',
    fontFamily = 'serif',
    includeTitlePage = true,
    includeCopyright = true,
    includeToc = true,
    showPageNumbers = true,
  } = opts;

  const pdfDoc = await PDFDocument.create();

  const fontDef = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.serif;
  const fontRegular = await pdfDoc.embedFont(fontDef.regular);
  const fontBold = await pdfDoc.embedFont(fontDef.bold);
  const fontItalic = await pdfDoc.embedFont(fontDef.italic);
  const fonts = { regular: fontRegular, bold: fontBold, italic: fontItalic };

  const styles = getTemplateStyles(template);

  // ===== Pass 1: Render all document pages =====
  // Documents are appended to the end of the (initially empty) PDF.
  // Track how many pages each document uses.
  const docPageCounts = [];
  for (const doc of documents) {
    const beforeCount = pdfDoc.getPageCount();
    const pageCount = renderDocumentPages(pdfDoc, doc, fonts, styles);
    docPageCounts.push(pageCount);
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
  // insertPage(index) pushes existing pages rightward
  let insertIdx = 0;

  // --- Title Page ---
  if (includeTitlePage) {
    const titlePage = pdfDoc.insertPage(insertIdx, [PAGE_WIDTH, PAGE_HEIGHT]);
    const titleFontSize = styles.titleFontSize;
    const titleText = book.title || 'Untitled';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleFontSize);
    titlePage.drawText(titleText, {
      x: CENTER_X - titleWidth / 2,
      y: PAGE_HEIGHT * 0.6,
      size: titleFontSize,
      font: fontBold,
      color: styles.titleColor,
    });

    if (book.subtitle) {
      const subtitleSize = styles.subtitleFontSize;
      const subtitleWidth = fontItalic.widthOfTextAtSize(book.subtitle, subtitleSize);
      titlePage.drawText(book.subtitle, {
        x: CENTER_X - subtitleWidth / 2,
        y: PAGE_HEIGHT * 0.6 - titleFontSize - 20,
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

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer;
}

/**
 * Generate a cover PDF for a book.
 * Cover dimensions depend on page count (affects spine width).
 *
 * @param {object} book - Book metadata
 * @param {number} pageCount - Total interior page count
 * @returns {Promise<ArrayBuffer>}
 */
export async function generateCoverPdf(book, pageCount) {
  const pdfDoc = await PDFDocument.create();

  // Calculate spine width: approximately 0.0025" per page for B&W, 0.002252" per page for color
  const spineWidthInches = pageCount * 0.0025;
  const spineWidthPt = spineWidthInches * 72;

  // Cover dimensions: back + spine + front, with bleed
  const coverBleed = 9; // 0.125"
  const coverWidth = (TRIM_WIDTH * 2) + spineWidthPt + (2 * coverBleed);
  const coverHeight = TRIM_HEIGHT + (2 * coverBleed);

  const coverPage = pdfDoc.addPage([coverWidth, coverHeight]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Background
  coverPage.drawRectangle({
    x: 0,
    y: 0,
    width: coverWidth,
    height: coverHeight,
    color: rgb(0.15, 0.2, 0.35),
  });

  // Front cover area starts after back cover + spine
  const frontCoverX = TRIM_WIDTH + coverBleed + spineWidthPt;
  const frontCenterX = frontCoverX + TRIM_WIDTH / 2;

  // Title on front cover
  const titleSize = 36;
  const titleText = book.title || 'Untitled';
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  coverPage.drawText(titleText, {
    x: frontCenterX - titleWidth / 2,
    y: coverHeight * 0.6,
    size: titleSize,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Subtitle on front cover
  if (book.subtitle) {
    const subtitleSize = 18;
    const subtitleWidth = fontRegular.widthOfTextAtSize(book.subtitle, subtitleSize);
    coverPage.drawText(book.subtitle, {
      x: frontCenterX - subtitleWidth / 2,
      y: coverHeight * 0.6 - titleSize - 20,
      size: subtitleSize,
      font: fontRegular,
      color: rgb(0.85, 0.85, 0.9),
    });
  }

  // Author on front cover
  if (book.author) {
    const authorSize = 16;
    const authorWidth = fontRegular.widthOfTextAtSize(book.author, authorSize);
    coverPage.drawText(book.author, {
      x: frontCenterX - authorWidth / 2,
      y: coverHeight * 0.3,
      size: authorSize,
      font: fontRegular,
      color: rgb(0.9, 0.9, 0.95),
    });
  }

  // Spine text (rotated - draw title vertically on spine)
  // pdf-lib does not easily rotate text, so we draw it horizontally
  // at a small font size that fits within the spine width
  if (spineWidthPt > 20) {
    const spineX = coverBleed + TRIM_WIDTH + spineWidthPt / 2;
    const spineFontSize = Math.min(10, spineWidthPt * 0.6);
    // Simple spine label
    coverPage.drawText(titleText.substring(0, 30), {
      x: spineX - spineFontSize / 2,
      y: coverHeight / 2,
      size: spineFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }

  // Back cover - "Created with KeptPages"
  const backCenterX = coverBleed + TRIM_WIDTH / 2;
  const backText = 'Created with KeptPages';
  const backTextWidth = fontRegular.widthOfTextAtSize(backText, 12);
  coverPage.drawText(backText, {
    x: backCenterX - backTextWidth / 2,
    y: coverBleed + 40,
    size: 12,
    font: fontRegular,
    color: rgb(0.7, 0.7, 0.75),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer;
}

/**
 * Get template-specific styles.
 */
function getTemplateStyles(template) {
  switch (template) {
    case 'modern':
      return {
        titleFontSize: 36,
        subtitleFontSize: 18,
        authorFontSize: 14,
        docTitleFontSize: 20,
        titleColor: rgb(0.1, 0.1, 0.1),
        subtitleColor: rgb(0.3, 0.3, 0.3),
        sectionColor: rgb(0.2, 0.2, 0.2),
        bodyColor: rgb(0.15, 0.15, 0.15),
        lineColor: rgb(0.7, 0.7, 0.7),
      };
    case 'minimal':
      return {
        titleFontSize: 28,
        subtitleFontSize: 14,
        authorFontSize: 12,
        docTitleFontSize: 16,
        titleColor: rgb(0, 0, 0),
        subtitleColor: rgb(0.4, 0.4, 0.4),
        sectionColor: rgb(0, 0, 0),
        bodyColor: rgb(0.1, 0.1, 0.1),
        lineColor: rgb(0.85, 0.85, 0.85),
      };
    case 'classic':
    default:
      return {
        titleFontSize: 32,
        subtitleFontSize: 16,
        authorFontSize: 14,
        docTitleFontSize: 18,
        titleColor: rgb(0.12, 0.12, 0.2),
        subtitleColor: rgb(0.35, 0.35, 0.45),
        sectionColor: rgb(0.2, 0.2, 0.3),
        bodyColor: rgb(0.1, 0.1, 0.1),
        lineColor: rgb(0.6, 0.6, 0.65),
      };
  }
}
