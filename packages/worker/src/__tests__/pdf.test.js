/**
 * Tests for the PDF generation service.
 * @see ../services/pdf.js
 *
 * Uses the real pdf-lib library (no mocking) since it runs fine in Node.
 */

import { generateBookPdf, generateCoverPdf } from '../services/pdf.js';
import { PDFDocument } from 'pdf-lib';

describe('generateBookPdf', () => {
  const sampleBook = {
    title: 'Family Recipes',
    subtitle: 'Passed down through generations',
    author: 'Jane Doe',
  };

  const sampleRecipeDoc = {
    type: 'recipe',
    title: 'Chocolate Cake',
    ingredients: [
      { item: 'flour', amount: '2', unit: 'cups' },
      { item: 'sugar', amount: '1', unit: 'cup' },
      { item: 'cocoa powder', amount: '0.5', unit: 'cup' },
    ],
    instructions: [
      'Preheat oven to 350 degrees',
      'Mix dry ingredients together',
      'Add wet ingredients and stir until smooth',
      'Pour into greased pan and bake for 30 minutes',
    ],
    notes: 'Best served with vanilla ice cream',
    content: 'Full chocolate cake recipe text',
  };

  const sampleDocumentDoc = {
    type: 'document',
    title: 'Letter from Grandma',
    content:
      'Dear family,\n\nI wanted to share these recipes with you.\nThey have been in our family for generations.\n\nWith love,\nGrandma',
    notes: 'Written circa 1965',
  };

  // ---------- Returns valid ArrayBuffer ----------
  it('returns a valid ArrayBuffer', async () => {
    const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('generated PDF can be loaded by pdf-lib', async () => {
    const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);
    const pdf = await PDFDocument.load(result);

    expect(pdf).toBeDefined();
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  // ---------- Expected page count ----------
  describe('page count', () => {
    it('contains expected number of pages: title + copyright + TOC + documents', async () => {
      const docs = [sampleRecipeDoc, sampleDocumentDoc];
      const result = await generateBookPdf(sampleBook, docs);
      const pdf = await PDFDocument.load(result);

      // title (1) + copyright (1) + TOC (1) + 2 documents = 5
      expect(pdf.getPageCount()).toBe(5);
    });

    it('contains 4 pages for a single document', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);
      const pdf = await PDFDocument.load(result);

      // title (1) + copyright (1) + TOC (1) + 1 document = 4
      expect(pdf.getPageCount()).toBe(4);
    });

    it('contains 3 pages for zero documents (title + copyright + TOC)', async () => {
      const result = await generateBookPdf(sampleBook, []);
      const pdf = await PDFDocument.load(result);

      // title (1) + copyright (1) + TOC (1) = 3
      expect(pdf.getPageCount()).toBe(3);
    });
  });

  // ---------- Empty documents array ----------
  describe('empty documents', () => {
    it('handles empty documents array without error', async () => {
      const result = await generateBookPdf(sampleBook, []);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('still produces title and copyright pages with no documents', async () => {
      const result = await generateBookPdf(sampleBook, []);
      const pdf = await PDFDocument.load(result);

      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------- Different template types ----------
  describe('template types', () => {
    it('generates PDF with classic template (default)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('generates PDF with modern template', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], 'modern');
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('generates PDF with minimal template', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], 'minimal');
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('falls back to classic for unknown template', async () => {
      const result = await generateBookPdf(
        sampleBook,
        [sampleRecipeDoc],
        'nonexistent'
      );
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('all templates produce the same number of pages for the same data', async () => {
      const docs = [sampleRecipeDoc];

      const classicPdf = await PDFDocument.load(
        await generateBookPdf(sampleBook, docs, 'classic')
      );
      const modernPdf = await PDFDocument.load(
        await generateBookPdf(sampleBook, docs, 'modern')
      );
      const minimalPdf = await PDFDocument.load(
        await generateBookPdf(sampleBook, docs, 'minimal')
      );

      expect(classicPdf.getPageCount()).toBe(modernPdf.getPageCount());
      expect(modernPdf.getPageCount()).toBe(minimalPdf.getPageCount());
    });
  });

  // ---------- Book metadata handling ----------
  describe('book metadata edge cases', () => {
    it('handles book with no subtitle', async () => {
      const book = { title: 'Simple Book', author: 'Author' };
      const result = await generateBookPdf(book, [sampleDocumentDoc]);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('handles book with no author', async () => {
      const book = { title: 'Anonymous Book' };
      const result = await generateBookPdf(book, [sampleDocumentDoc]);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('handles book with missing title (defaults to Untitled)', async () => {
      const book = { author: 'Someone' };
      const result = await generateBookPdf(book, [sampleDocumentDoc]);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });
  });

  // ---------- Options object (US-EXPORT-2) ----------
  describe('export options', () => {
    it('accepts options object instead of template string', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], {
        template: 'modern',
        fontFamily: 'sans-serif',
      });
      expect(result).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBe(4); // title + copyright + TOC + 1 doc
    });

    it('defaults to classic/serif when no options given', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], {});
      expect(result).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBe(4);
    });

    describe('fontFamily', () => {
      for (const ff of ['serif', 'sans-serif', 'monospace']) {
        it(`renders with ${ff} font`, async () => {
          const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { fontFamily: ff });
          expect(result).toBeInstanceOf(ArrayBuffer);
          const pdf = await PDFDocument.load(result);
          expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
        });
      }

      it('falls back to serif for unknown font family', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { fontFamily: 'fantasy' });
        expect(result).toBeInstanceOf(ArrayBuffer);
      });
    });

    describe('includeTitlePage', () => {
      it('omits title page when false', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { includeTitlePage: false });
        const pdf = await PDFDocument.load(result);
        // copyright (1) + TOC (1) + 1 doc = 3
        expect(pdf.getPageCount()).toBe(3);
      });
    });

    describe('includeCopyright', () => {
      it('omits copyright page when false', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { includeCopyright: false });
        const pdf = await PDFDocument.load(result);
        // title (1) + TOC (1) + 1 doc = 3
        expect(pdf.getPageCount()).toBe(3);
      });
    });

    describe('includeToc', () => {
      it('omits TOC page when false', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { includeToc: false });
        const pdf = await PDFDocument.load(result);
        // title (1) + copyright (1) + 1 doc = 3
        expect(pdf.getPageCount()).toBe(3);
      });
    });

    describe('all front matter off', () => {
      it('produces only document pages when all front matter disabled', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], {
          includeTitlePage: false,
          includeCopyright: false,
          includeToc: false,
        });
        const pdf = await PDFDocument.load(result);
        // just 1 document page
        expect(pdf.getPageCount()).toBe(1);
      });
    });

    describe('showPageNumbers', () => {
      it('produces valid PDF with page numbers enabled (default)', async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], { showPageNumbers: true });
        expect(result).toBeInstanceOf(ArrayBuffer);
      });

      it('produces valid PDF with page numbers disabled', async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], { showPageNumbers: false });
        expect(result).toBeInstanceOf(ArrayBuffer);
      });
    });

    describe('combined options', () => {
      it('handles all options together', async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc, sampleDocumentDoc], {
          template: 'minimal',
          fontFamily: 'monospace',
          includeTitlePage: true,
          includeCopyright: false,
          includeToc: true,
          showPageNumbers: true,
        });
        const pdf = await PDFDocument.load(result);
        // title (1) + TOC (1) + 2 docs = 4
        expect(pdf.getPageCount()).toBe(4);
      });
    });
  });

  // ---------- Document type handling ----------
  describe('document type handling', () => {
    it('renders recipe documents with ingredients and instructions', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);
      // If it does not throw and produces a valid PDF, rendering succeeded
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBeGreaterThan(3);
    });

    it('renders plain document content', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc]);
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBe(4);
    });

    it('handles document with notes', async () => {
      const docWithNotes = {
        type: 'document',
        title: 'Note Page',
        content: 'Some content here.',
        notes: 'This is an important note about the document.',
      };
      const result = await generateBookPdf(sampleBook, [docWithNotes]);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('handles document without notes', async () => {
      const docNoNotes = {
        type: 'document',
        title: 'No Notes',
        content: 'Just content, no notes.',
      };
      const result = await generateBookPdf(sampleBook, [docNoNotes]);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });
});

describe('generateCoverPdf', () => {
  const sampleBook = {
    title: 'Family Recipes',
    subtitle: 'A collection of favorites',
    author: 'Jane Doe',
  };

  // ---------- Returns a valid buffer ----------
  it('returns a valid ArrayBuffer', async () => {
    const result = await generateCoverPdf(sampleBook, 100);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('generated cover PDF can be loaded by pdf-lib', async () => {
    const result = await generateCoverPdf(sampleBook, 100);
    const pdf = await PDFDocument.load(result);

    expect(pdf).toBeDefined();
    expect(pdf.getPageCount()).toBe(1); // Cover is a single page
  });

  // ---------- Spine width scales with page count ----------
  describe('spine width scaling', () => {
    it('cover spine width scales with page count', async () => {
      const smallBookResult = await generateCoverPdf(sampleBook, 20);
      const largeBookResult = await generateCoverPdf(sampleBook, 500);

      const smallPdf = await PDFDocument.load(smallBookResult);
      const largePdf = await PDFDocument.load(largeBookResult);

      const smallPageWidth = smallPdf.getPage(0).getWidth();
      const largePageWidth = largePdf.getPage(0).getWidth();

      // Larger book should have wider cover (wider spine)
      expect(largePageWidth).toBeGreaterThan(smallPageWidth);
    });

    it('calculates spine width proportionally to page count', async () => {
      // Spine width formula: pageCount * 0.0025 inches * 72 pt/inch
      // 100 pages: 0.25" * 72 = 18pt
      // 200 pages: 0.50" * 72 = 36pt
      // Difference should be ~18pt
      const cover100 = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 100)
      );
      const cover200 = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 200)
      );

      const width100 = cover100.getPage(0).getWidth();
      const width200 = cover200.getPage(0).getWidth();
      const difference = width200 - width100;

      // 100 extra pages * 0.0025" * 72 pt/in = 18pt
      expect(difference).toBeCloseTo(18, 0);
    });
  });

  // ---------- Cover metadata edge cases ----------
  describe('cover metadata edge cases', () => {
    it('handles book with no subtitle', async () => {
      const book = { title: 'Title Only', author: 'Author' };
      const result = await generateCoverPdf(book, 50);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('handles book with no author', async () => {
      const book = { title: 'No Author Book' };
      const result = await generateCoverPdf(book, 50);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('handles book with missing title (falls back to Untitled)', async () => {
      const book = {};
      const result = await generateCoverPdf(book, 50);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('handles very small page count', async () => {
      const result = await generateCoverPdf(sampleBook, 1);

      expect(result).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBe(1);
    });

    it('handles large page count', async () => {
      const result = await generateCoverPdf(sampleBook, 1000);

      expect(result).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBe(1);
    });
  });
});
