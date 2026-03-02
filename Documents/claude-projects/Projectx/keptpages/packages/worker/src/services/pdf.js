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
const CONTENT_WIDTH_LEFT = TRIM_WIDTH - SAFETY_MARGIN - GUTTER;  // left page (gutter on right)
const CONTENT_WIDTH_RIGHT = TRIM_WIDTH - SAFETY_MARGIN - GUTTER; // right page (gutter on left)

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
 * Generate the interior PDF for a book project.
 *
 * @param {object} book - Book metadata (title, subtitle, author)
 * @param {object[]} documents - Array of documents with extracted data
 * @param {string} template - Template name (e.g., 'classic', 'modern', 'minimal')
 * @returns {Promise<ArrayBuffer>} The generated PDF as an ArrayBuffer
 */
export async function generateBookPdf(book, documents, template = 'classic') {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Template-based styling
  const styles = getTemplateStyles(template);

  // ----- Title Page -----
  const titlePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleCenterX = PAGE_WIDTH / 2;

  // Book title
  const titleFontSize = styles.titleFontSize;
  const titleWidth = fontBold.widthOfTextAtSize(book.title || 'Untitled', titleFontSize);
  titlePage.drawText(book.title || 'Untitled', {
    x: titleCenterX - titleWidth / 2,
    y: PAGE_HEIGHT * 0.6,
    size: titleFontSize,
    font: fontBold,
    color: styles.titleColor,
  });

  // Subtitle
  if (book.subtitle) {
    const subtitleSize = styles.subtitleFontSize;
    const subtitleWidth = fontItalic.widthOfTextAtSize(book.subtitle, subtitleSize);
    titlePage.drawText(book.subtitle, {
      x: titleCenterX - subtitleWidth / 2,
      y: PAGE_HEIGHT * 0.6 - titleFontSize - 20,
      size: subtitleSize,
      font: fontItalic,
      color: styles.subtitleColor,
    });
  }

  // Author
  if (book.author) {
    const authorSize = styles.authorFontSize;
    const authorWidth = fontRegular.widthOfTextAtSize(book.author, authorSize);
    titlePage.drawText(book.author, {
      x: titleCenterX - authorWidth / 2,
      y: PAGE_HEIGHT * 0.35,
      size: authorSize,
      font: fontRegular,
      color: styles.bodyColor,
    });
  }

  // ----- Copyright Page -----
  const copyrightPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
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
      x: BLEED + GUTTER + 10,
      y: copyrightY,
      size: 10,
      font: fontRegular,
      color: styles.bodyColor,
    });
    copyrightY -= 14;
  }

  // ----- Table of Contents -----
  const tocPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const tocTitle = 'Table of Contents';
  const tocTitleWidth = fontBold.widthOfTextAtSize(tocTitle, 24);
  tocPage.drawText(tocTitle, {
    x: titleCenterX - tocTitleWidth / 2,
    y: CONTENT_TOP - 40,
    size: 24,
    font: fontBold,
    color: styles.titleColor,
  });

  let tocY = CONTENT_TOP - 80;
  const tocStartPage = 4; // title, copyright, toc, then documents

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const docTitle = doc.title || `Document ${i + 1}`;
    const pageNum = String(tocStartPage + i);

    // Document title on the left
    tocPage.drawText(docTitle, {
      x: BLEED + GUTTER + 10,
      y: tocY,
      size: 12,
      font: fontRegular,
      color: styles.bodyColor,
    });

    // Page number on the right
    const pageNumWidth = fontRegular.widthOfTextAtSize(pageNum, 12);
    tocPage.drawText(pageNum, {
      x: PAGE_WIDTH - BLEED - SAFETY_MARGIN - pageNumWidth,
      y: tocY,
      size: 12,
      font: fontRegular,
      color: styles.bodyColor,
    });

    tocY -= 20;

    // If TOC overflows, add another page
    if (tocY < CONTENT_BOTTOM + 40 && i < documents.length - 1) {
      // For simplicity, stop listing (a production version would add pages)
      tocPage.drawText('...', {
        x: BLEED + GUTTER + 10,
        y: tocY,
        size: 12,
        font: fontRegular,
        color: styles.bodyColor,
      });
      break;
    }
  }

  // ----- Document Pages -----
  const contentMaxWidth = CONTENT_WIDTH_RIGHT - 20; // Some padding

  for (const doc of documents) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = CONTENT_TOP - 40;
    const leftX = BLEED + GUTTER + 10;

    // Document title
    const docTitleText = doc.title || 'Untitled';
    page.drawText(docTitleText, {
      x: leftX,
      y,
      size: styles.docTitleFontSize,
      font: fontBold,
      color: styles.titleColor,
    });
    y -= styles.docTitleFontSize + 16;

    // Separator line
    page.drawLine({
      start: { x: leftX, y: y + 6 },
      end: { x: leftX + contentMaxWidth, y: y + 6 },
      thickness: 0.5,
      color: styles.lineColor,
    });
    y -= 12;

    // If recipe, render ingredients section
    if (doc.type === 'recipe' && doc.ingredients && doc.ingredients.length > 0) {
      page.drawText('Ingredients', {
        x: leftX,
        y,
        size: 14,
        font: fontBold,
        color: styles.sectionColor,
      });
      y -= 20;

      for (const ing of doc.ingredients) {
        const ingText = `  \u2022 ${ing.amount || ''} ${ing.unit || ''} ${ing.item || ''}`.trim();
        const ingLines = wrapText(ingText, fontRegular, 11, contentMaxWidth);
        for (const line of ingLines) {
          if (y < CONTENT_BOTTOM + 20) {
            // Overflow - would need a new page in production
            break;
          }
          page.drawText(line, {
            x: leftX + 10,
            y,
            size: 11,
            font: fontRegular,
            color: styles.bodyColor,
          });
          y -= 15;
        }
      }
      y -= 10;
    }

    // If recipe, render instructions
    if (doc.type === 'recipe' && doc.instructions && doc.instructions.length > 0) {
      if (y > CONTENT_BOTTOM + 40) {
        page.drawText('Instructions', {
          x: leftX,
          y,
          size: 14,
          font: fontBold,
          color: styles.sectionColor,
        });
        y -= 20;

        for (let i = 0; i < doc.instructions.length; i++) {
          const stepText = `${i + 1}. ${doc.instructions[i]}`;
          const stepLines = wrapText(stepText, fontRegular, 11, contentMaxWidth - 10);
          for (const line of stepLines) {
            if (y < CONTENT_BOTTOM + 20) break;
            page.drawText(line, {
              x: leftX + 10,
              y,
              size: 11,
              font: fontRegular,
              color: styles.bodyColor,
            });
            y -= 15;
          }
          y -= 5; // Space between steps
        }
      }
    }

    // For documents or additional content, render the raw content
    if (doc.type !== 'recipe' && doc.content) {
      const paragraphs = doc.content.split('\n');
      for (const para of paragraphs) {
        if (para.trim() === '') {
          y -= 10;
          continue;
        }
        const lines = wrapText(para, fontRegular, 11, contentMaxWidth);
        for (const line of lines) {
          if (y < CONTENT_BOTTOM + 20) break;
          page.drawText(line, {
            x: leftX,
            y,
            size: 11,
            font: fontRegular,
            color: styles.bodyColor,
          });
          y -= 15;
        }
      }
    }

    // Notes
    if (doc.notes && y > CONTENT_BOTTOM + 60) {
      y -= 15;
      page.drawText('Notes', {
        x: leftX,
        y,
        size: 12,
        font: fontItalic,
        color: styles.sectionColor,
      });
      y -= 16;

      const noteLines = wrapText(doc.notes, fontItalic, 10, contentMaxWidth);
      for (const line of noteLines) {
        if (y < CONTENT_BOTTOM + 20) break;
        page.drawText(line, {
          x: leftX + 5,
          y,
          size: 10,
          font: fontItalic,
          color: styles.bodyColor,
        });
        y -= 14;
      }
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
