/**
 * Tests for the PDF generation service.
 * @see ../services/pdf.js
 *
 * Uses the real pdf-lib library (no mocking) since it runs fine in Node.
 */

import { generateBookPdf, generateCoverPdf, calculateSpineWidth, renderBlueprintBook } from '../services/pdf.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';

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

  // ---------- Returns { buffer, pageCount } ----------
  it('returns a buffer and pageCount', async () => {
    const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);

    expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    expect(result.buffer.byteLength).toBeGreaterThan(0);
    expect(typeof result.pageCount).toBe('number');
    expect(result.pageCount).toBeGreaterThan(0);
  });

  it('handles Unicode characters in text without crashing', async () => {
    const unicodeDoc = {
      type: 'recipe',
      title: 'Grandma\u2019s Pie \u2014 \u2153 cup sugar',
      ingredients: [
        '\u2153 cup flour',
        '\u00BD tsp salt',
        '\u2154 cup milk',
        'Temp: 350\u2109',
      ],
      instructions: [
        'Mix \u2026 everything',
        'Bake at 350\u00B0F for \u00BD hour',
      ],
      notes: 'Notes with \u201Csmart quotes\u201D and \u2013 en-dash',
    };
    const result = await generateBookPdf(sampleBook, [unicodeDoc]);
    expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });

  it('handles non-string content fields gracefully', async () => {
    const weirdDoc = {
      type: 'document',
      title: 'Test',
      content: ['paragraph one', 'paragraph two'], // array instead of string
      notes: null,
    };
    const result = await generateBookPdf(sampleBook, [weirdDoc]);
    expect(result.buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('generated PDF can be loaded by pdf-lib', async () => {
    const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);
    const pdf = await PDFDocument.load(result.buffer);

    expect(pdf).toBeDefined();
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getPageCount()).toBe(result.pageCount);
  });

  // ---------- Expected page count ----------
  describe('page count', () => {
    it('contains expected number of pages: title + copyright + TOC + documents', async () => {
      const docs = [sampleRecipeDoc, sampleDocumentDoc];
      const result = await generateBookPdf(sampleBook, docs);
      const pdf = await PDFDocument.load(result.buffer);

      // title (1) + copyright (1) + TOC (1) + 2 documents = 5
      expect(pdf.getPageCount()).toBe(5);
    });

    it('contains 4 pages for a single document', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc]);
      const pdf = await PDFDocument.load(result.buffer);

      // title (1) + copyright (1) + TOC (1) + 1 document = 4
      expect(pdf.getPageCount()).toBe(4);
    });

    it('contains 3 pages for zero documents (title + copyright + TOC)', async () => {
      const result = await generateBookPdf(sampleBook, []);
      const pdf = await PDFDocument.load(result.buffer);

      // title (1) + copyright (1) + TOC (1) = 3
      expect(pdf.getPageCount()).toBe(3);
    });
  });

  // ---------- Empty documents array ----------
  describe('empty documents', () => {
    it('handles empty documents array without error', async () => {
      const result = await generateBookPdf(sampleBook, []);

      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });

    it('still produces title and copyright pages with no documents', async () => {
      const result = await generateBookPdf(sampleBook, []);
      const pdf = await PDFDocument.load(result.buffer);

      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------- Color theme templates (US-EXPORT-7) ----------
  describe('color themes', () => {
    const themes = ['heritage', 'garden', 'heirloom', 'parchment', 'modern'];

    for (const theme of themes) {
      it(`generates valid PDF with ${theme} theme`, async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], { template: theme });
        expect(result.buffer).toBeInstanceOf(ArrayBuffer);
        expect(result.buffer.byteLength).toBeGreaterThan(0);

        const pdf = await PDFDocument.load(result.buffer);
        expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
      });
    }

    it('uses heritage as default theme', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], {});
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBe(4);
    });

    it('falls back to heritage for unknown theme', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], { template: 'nonexistent' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });
  });

  // ---------- Legacy template backward compatibility ----------
  describe('legacy template names', () => {
    it('generates PDF with classic template (maps to heritage)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], 'classic');
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });

    it('generates PDF with modern template', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], 'modern');
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });

    it('generates PDF with minimal template (maps to parchment)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], 'minimal');
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });
  });

  // ---------- Decorative graphics (US-EXPORT-8) ----------
  describe('decorative graphics', () => {
    it('renders page borders without error (single border)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'heritage' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
    });

    it('renders double border without error (heirloom)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'heirloom' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('renders no border without error (modern)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'modern' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('renders diamond dividers without error', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc, sampleDocumentDoc], { template: 'heritage' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('renders dot dividers without error (garden)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc, sampleDocumentDoc], { template: 'garden' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('renders parchment background without error', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'parchment' });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('renders title page decoration on all themes', async () => {
      for (const theme of ['heritage', 'garden', 'heirloom', 'parchment', 'modern']) {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: theme });
        expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      }
    });
  });

  // ---------- Scan image embedding (US-EXPORT-9) ----------
  describe('scan image embedding', () => {
    // Create a minimal valid 1x1 JPEG for testing
    function createTestJpeg() {
      // Minimal valid JPEG: SOI + APP0 + DQT + SOF0 + DHT + SOS + image data + EOI
      return new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9,
      ]);
    }

    it('embeds JPEG scan image and adds an extra page', async () => {
      const docWithImage = {
        ...sampleDocumentDoc,
        _imageBytes: createTestJpeg(),
        _mimeType: 'image/jpeg',
      };
      const result = await generateBookPdf(sampleBook, [docWithImage]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      // title (1) + copyright (1) + TOC (1) + scan image page (1) + text page (1) = 5
      expect(pdf.getPageCount()).toBe(5);
    });

    it('handles multiple documents with images', async () => {
      const doc1 = { ...sampleRecipeDoc, _imageBytes: createTestJpeg(), _mimeType: 'image/jpeg' };
      const doc2 = { ...sampleDocumentDoc, _imageBytes: createTestJpeg(), _mimeType: 'image/jpeg' };
      const result = await generateBookPdf(sampleBook, [doc1, doc2]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      // title(1) + copyright(1) + TOC(1) + img1(1) + recipe(1) + img2(1) + doc(1) = 7
      expect(pdf.getPageCount()).toBe(7);
    });

    it('gracefully skips documents without images', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      // No image pages: title(1) + copyright(1) + TOC(1) + doc(1) = 4
      expect(pdf.getPageCount()).toBe(4);
    });

    it('handles mix of documents with and without images', async () => {
      const docWithImage = { ...sampleRecipeDoc, _imageBytes: createTestJpeg(), _mimeType: 'image/jpeg' };
      const result = await generateBookPdf(sampleBook, [docWithImage, sampleDocumentDoc]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      // title(1) + copyright(1) + TOC(1) + img(1) + recipe(1) + doc(1) = 6
      expect(pdf.getPageCount()).toBe(6);
    });

    it('skips image if embedding fails (invalid bytes)', async () => {
      const docWithBadImage = {
        ...sampleDocumentDoc,
        _imageBytes: new Uint8Array([0, 1, 2, 3]),
        _mimeType: 'image/jpeg',
      };
      const result = await generateBookPdf(sampleBook, [docWithBadImage]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      // Should skip image: title(1) + copyright(1) + TOC(1) + doc(1) = 4
      expect(pdf.getPageCount()).toBe(4);
    });
  });

  // ---------- Cover photo on title page ----------
  describe('cover photo embedding on title page', () => {
    function createTestJpegForCover() {
      return new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9,
      ]);
    }

    it('embeds cover photo on title page', async () => {
      const bookWithPhoto = {
        ...sampleBook,
        _coverPhotoBytes: createTestJpegForCover(),
        _coverPhotoMimeType: 'image/jpeg',
      };
      const result = await generateBookPdf(bookWithPhoto, [sampleDocumentDoc]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      // Same page count — photo goes on existing title page, not a new page
      expect(pdf.getPageCount()).toBe(4);
    });

    it('skips cover photo gracefully on invalid bytes', async () => {
      const bookWithBadPhoto = {
        ...sampleBook,
        _coverPhotoBytes: new Uint8Array([0, 1, 2, 3]),
        _coverPhotoMimeType: 'image/jpeg',
      };
      const result = await generateBookPdf(bookWithBadPhoto, [sampleDocumentDoc]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBe(4);
    });

    it('generates without cover photo (no _coverPhotoBytes)', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBe(4);
    });
  });

  // ---------- Template produces different PDFs ----------
  describe('different templates produce different PDFs', () => {
    it('heritage and modern produce different size PDFs', async () => {
      const heritageResult = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'heritage' });
      const modernResult = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'modern' });
      // Different templates should produce different byte counts due to different decorations
      expect(heritageResult.buffer.byteLength).not.toBe(modernResult.buffer.byteLength);
    });

    it('parchment has background color (larger PDF)', async () => {
      const heritageResult = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'heritage' });
      const parchmentResult = await generateBookPdf(sampleBook, [sampleDocumentDoc], { template: 'parchment' });
      // Parchment has background rectangles, making it larger
      expect(parchmentResult.buffer.byteLength).toBeGreaterThan(heritageResult.buffer.byteLength);
    });
  });

  // ---------- Book metadata handling ----------
  describe('book metadata edge cases', () => {
    it('handles book with no subtitle', async () => {
      const book = { title: 'Simple Book', author: 'Author' };
      const result = await generateBookPdf(book, [sampleDocumentDoc]);

      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });

    it('handles book with no author', async () => {
      const book = { title: 'Anonymous Book' };
      const result = await generateBookPdf(book, [sampleDocumentDoc]);

      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });

    it('handles book with missing title (defaults to Untitled)', async () => {
      const book = { author: 'Someone' };
      const result = await generateBookPdf(book, [sampleDocumentDoc]);

      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });
  });

  // ---------- Options object (US-EXPORT-2) ----------
  describe('export options', () => {
    it('accepts options object instead of template string', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], {
        template: 'modern',
        fontFamily: 'sans-serif',
      });
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBe(4); // title + copyright + TOC + 1 doc
    });

    it('defaults to heritage/serif when no options given', async () => {
      const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], {});
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBe(4);
    });

    describe('fontFamily', () => {
      for (const ff of ['serif', 'sans-serif', 'monospace']) {
        it(`renders with ${ff} font`, async () => {
          const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { fontFamily: ff });
          expect(result.buffer).toBeInstanceOf(ArrayBuffer);
          const pdf = await PDFDocument.load(result.buffer);
          expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
        });
      }

      it('falls back to serif for unknown font family', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { fontFamily: 'fantasy' });
        expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      });
    });

    describe('includeTitlePage', () => {
      it('omits title page when false', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { includeTitlePage: false });
        const pdf = await PDFDocument.load(result.buffer);
        // copyright (1) + TOC (1) + 1 doc = 3
        expect(pdf.getPageCount()).toBe(3);
      });
    });

    describe('includeCopyright', () => {
      it('omits copyright page when false', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { includeCopyright: false });
        const pdf = await PDFDocument.load(result.buffer);
        // title (1) + TOC (1) + 1 doc = 3
        expect(pdf.getPageCount()).toBe(3);
      });
    });

    describe('includeToc', () => {
      it('omits TOC page when false', async () => {
        const result = await generateBookPdf(sampleBook, [sampleDocumentDoc], { includeToc: false });
        const pdf = await PDFDocument.load(result.buffer);
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
        const pdf = await PDFDocument.load(result.buffer);
        // just 1 document page
        expect(pdf.getPageCount()).toBe(1);
      });
    });

    describe('showPageNumbers', () => {
      it('produces valid PDF with page numbers enabled (default)', async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], { showPageNumbers: true });
        expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      });

      it('produces valid PDF with page numbers disabled', async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc], { showPageNumbers: false });
        expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      });
    });

    describe('combined options', () => {
      it('handles all options together', async () => {
        const result = await generateBookPdf(sampleBook, [sampleRecipeDoc, sampleDocumentDoc], {
          template: 'heirloom',
          fontFamily: 'monospace',
          includeTitlePage: true,
          includeCopyright: false,
          includeToc: true,
          showPageNumbers: true,
        });
        const pdf = await PDFDocument.load(result.buffer);
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
      const pdf = await PDFDocument.load(result.buffer);
      expect(pdf.getPageCount()).toBeGreaterThan(3);
    });

    it('renders plain document content', async () => {
      const result = await generateBookPdf(sampleBook, [sampleDocumentDoc]);
      const pdf = await PDFDocument.load(result.buffer);
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
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('handles document without notes', async () => {
      const docNoNotes = {
        type: 'document',
        title: 'No Notes',
        content: 'Just content, no notes.',
      };
      const result = await generateBookPdf(sampleBook, [docNoNotes]);
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
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

    it('calculates spine width using PB formula by default', async () => {
      // PB spine width formula: (pages / 444) + 0.06 inches * 72 pt/inch
      // 100 pages: (100/444 + 0.06) * 72 ≈ 20.54pt
      // 200 pages: (200/444 + 0.06) * 72 ≈ 36.76pt
      // Difference should be (100/444) * 72 ≈ 16.22pt
      const cover100 = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 100)
      );
      const cover200 = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 200)
      );

      const width100 = cover100.getPage(0).getWidth();
      const width200 = cover200.getPage(0).getWidth();
      const difference = width200 - width100;

      // 100 extra pages / 444 * 72 ≈ 16.22pt
      expect(difference).toBeCloseTo((100 / 444) * 72, 0);
    });

    it('CW binding produces wider cover than PB for same page count', async () => {
      const coverPB = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 60, null, 'PB')
      );
      const coverCW = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 60, null, 'CW')
      );

      // CW 60 pages = 0.25" spine, PB 60 pages = (60/444)+0.06 ≈ 0.195"
      expect(coverCW.getPage(0).getWidth()).toBeGreaterThan(coverPB.getPage(0).getWidth());
    });

    it('CW cover uses 0.875" wrap+bleed (Lulu casewrap requirement)', async () => {
      const coverCW = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 27, null, 'CW')
      );
      const page = coverCW.getPage(0);
      // CW 27 pages: spine = 0.25", wrap = 0.875" per side
      // Width: 2*612 + 0.25*72 + 2*63 = 1224 + 18 + 126 = 1368pt = 19.0"
      // Height: 792 + 2*63 = 918pt = 12.75"
      expect(page.getWidth()).toBeCloseTo(1368, 0);
      expect(page.getHeight()).toBeCloseTo(918, 0);
    });

    it('PB cover uses 0.125" bleed (standard softcover)', async () => {
      const coverPB = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 60, null, 'PB')
      );
      const page = coverPB.getPage(0);
      // PB 60 pages: spine = (60/444)+0.06 ≈ 0.195", bleed = 0.125" per side
      // Height: 792 + 2*9 = 810pt = 11.25"
      expect(page.getHeight()).toBeCloseTo(810, 0);
    });

    it('CO binding produces narrowest cover (no spine)', async () => {
      const coverPB = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 100, null, 'PB')
      );
      const coverCO = await PDFDocument.load(
        await generateCoverPdf(sampleBook, 100, null, 'CO')
      );

      // CO has no spine, so cover should be narrower
      expect(coverCO.getPage(0).getWidth()).toBeLessThan(coverPB.getPage(0).getWidth());
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

// ===== Blueprint-Driven PDF Rendering Tests (US-BOOK-10) =====

describe('renderBlueprintBook', () => {
  async function createFontMap(pdfDoc) {
    const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    return { fraunces: { regular, bold, italic } };
  }

  const baseBlueprintPage = (kind, elements = []) => ({
    id: 'page-1',
    kind,
    background: { type: 'solid', color: '#ffffff' },
    elements,
  });

  const baseBlueprint = (pages, overrides = {}) => ({
    version: 1,
    globalSettings: {
      template: 'heritage',
      fontFamily: 'fraunces',
      includeTitlePage: false,
      includeCopyright: false,
      includeToc: false,
      showPageNumbers: true,
      ...overrides,
    },
    coverDesign: { title: 'Test Book', subtitle: 'A test', author: 'Author' },
    pages,
    additionalImages: [],
  });

  it('renders a single blank page', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint([baseBlueprintPage('blank')]);

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    expect(pageCount).toBe(1);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it('renders multiple pages', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const pages = [
      baseBlueprintPage('blank'),
      baseBlueprintPage('blank'),
      baseBlueprintPage('blank'),
    ];
    const blueprint = baseBlueprint(pages);

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    expect(pageCount).toBe(3);
    expect(pdfDoc.getPageCount()).toBe(3);
  });

  it('renders front matter when enabled', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint([baseBlueprintPage('blank')], {
      includeTitlePage: true,
      includeCopyright: true,
      includeToc: true,
    });

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    // 3 front matter + 1 content page
    expect(pageCount).toBe(4);
    expect(pdfDoc.getPageCount()).toBe(4);
  });

  it('renders text elements at correct positions', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const page = baseBlueprintPage('custom-text', [
      {
        id: 'text-1', type: 'text',
        x: 0.1, y: 0.1, width: 0.8, height: 0.1,
        text: 'Hello World', fontSize: 24, fontWeight: 'bold',
        alignment: 'center', color: '#2C1810',
      },
    ]);
    const blueprint = baseBlueprint([page]);

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    expect(pageCount).toBe(1);
    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
  });

  it('renders shape elements', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const page = baseBlueprintPage('blank', [
      {
        id: 'rect-1', type: 'shape', shapeType: 'rect',
        x: 0.2, y: 0.2, width: 0.6, height: 0.3,
        stroke: '#c2891f', strokeWidth: 2, fill: '#f0ebe3',
      },
      {
        id: 'circle-1', type: 'shape', shapeType: 'circle',
        x: 0.3, y: 0.6, width: 0.4, height: 0.3,
        stroke: '#333333', strokeWidth: 1,
      },
    ]);
    const blueprint = baseBlueprint([page]);

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    expect(pageCount).toBe(1);
  });

  it('renders decorative elements', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const page = baseBlueprintPage('section-divider', [
      {
        id: 'line-1', type: 'decorative', shapeType: 'line',
        x: 0.2, y: 0.5, width: 0.6, height: 0.01,
        stroke: '#c2891f', strokeWidth: 2,
      },
    ]);
    const blueprint = baseBlueprint([page]);

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    expect(pageCount).toBe(1);
  });

  it('handles image elements without images gracefully', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const page = baseBlueprintPage('photo', [
      {
        id: 'img-1', type: 'image',
        x: 0.1, y: 0.1, width: 0.8, height: 0.7,
        imageKey: 'nonexistent-key', frameStyle: 'simple',
      },
    ]);
    const blueprint = baseBlueprint([page]);

    // Should not throw even though image is missing
    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);
    expect(pageCount).toBe(1);
  });

  it('renders texture backgrounds', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);

    for (const texture of ['linen', 'paper-grain', 'watercolor-wash', 'parchment']) {
      const page = baseBlueprintPage('blank');
      page.background = { type: 'texture', color: '#f5f0e8', texture };
      const blueprint = baseBlueprint([page]);

      const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);
      expect(pageCount).toBeGreaterThan(0);
    }
  });

  it('renders all page types', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const kinds = ['document', 'custom-text', 'photo', 'photo-collage', 'section-divider', 'dedication', 'blank'];

    const pages = kinds.map((kind) => {
      const elements = [];
      if (kind === 'document' || kind === 'custom-text') {
        elements.push({
          id: `text-${kind}`, type: 'text',
          x: 0.1, y: 0.1, width: 0.8, height: 0.1,
          text: `${kind} page`, fontSize: 14, color: '#333',
        });
      }
      return baseBlueprintPage(kind, elements);
    });

    const blueprint = baseBlueprint(pages);
    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);

    expect(pageCount).toBe(7);
    expect(pdfDoc.getPageCount()).toBe(7);
  });

  it('produces a valid PDF that can be loaded', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const page = baseBlueprintPage('custom-text', [
      { id: 't1', type: 'text', x: 0.1, y: 0.1, width: 0.8, height: 0.05, text: 'Title', fontSize: 28, fontWeight: 'bold', alignment: 'center', color: '#2C1810' },
      { id: 't2', type: 'text', x: 0.1, y: 0.2, width: 0.8, height: 0.6, text: 'Body text here with some content.', fontSize: 14, color: '#333' },
      { id: 'l1', type: 'decorative', x: 0.3, y: 0.18, width: 0.4, height: 0.01, shapeType: 'line', stroke: '#c2891f', strokeWidth: 1 },
    ]);
    const blueprint = baseBlueprint([page], { includeTitlePage: true });

    await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap);
    const pdfBytes = await pdfDoc.save();

    // Verify we can reload it
    const reloaded = await PDFDocument.load(pdfBytes);
    expect(reloaded.getPageCount()).toBe(2); // title page + 1 content
  });

  it('legacy books (no blueprint) still work via generateBookPdf', async () => {
    // Verify the existing function still works
    const result = await generateBookPdf(
      { title: 'Legacy Book', subtitle: 'Legacy' },
      [{ type: 'document', title: 'Doc', content: 'Content here' }],
      'heritage'
    );

    expect(result.buffer).toBeInstanceOf(ArrayBuffer);
    expect(result.pageCount).toBeGreaterThan(0);
  });
});

// ===== calculateSpineWidth Unit Tests =====

describe('calculateSpineWidth', () => {
  // PB (softcover) — formula: (pages / 444) + 0.06
  describe('PB (softcover)', () => {
    it('60 pages → (60/444) + 0.06', () => {
      expect(calculateSpineWidth(60, 'PB')).toBeCloseTo((60 / 444) + 0.06, 6);
    });

    it('100 pages → (100/444) + 0.06', () => {
      expect(calculateSpineWidth(100, 'PB')).toBeCloseTo((100 / 444) + 0.06, 6);
    });

    it('444 pages → (444/444) + 0.06 = 1.06', () => {
      expect(calculateSpineWidth(444, 'PB')).toBeCloseTo(1.06, 6);
    });
  });

  // CW (hardcover) — lookup table
  describe('CW (hardcover)', () => {
    it('pages < 24 → 0.25', () => {
      expect(calculateSpineWidth(10, 'CW')).toBe(0.25);
    });

    it('24 pages → 0.25 (first bracket)', () => {
      expect(calculateSpineWidth(24, 'CW')).toBe(0.25);
    });

    it('84 pages → 0.25 (boundary)', () => {
      expect(calculateSpineWidth(84, 'CW')).toBe(0.25);
    });

    it('85 pages → 0.50 (next bracket)', () => {
      expect(calculateSpineWidth(85, 'CW')).toBe(0.5);
    });

    it('140 pages → 0.50 (boundary)', () => {
      expect(calculateSpineWidth(140, 'CW')).toBe(0.5);
    });

    it('500 pages → 1.375', () => {
      expect(calculateSpineWidth(500, 'CW')).toBe(1.375);
    });

    it('800 pages → 2.0625 (last bracket)', () => {
      expect(calculateSpineWidth(800, 'CW')).toBe(2.0625);
    });

    it('801+ pages → 2.125', () => {
      expect(calculateSpineWidth(801, 'CW')).toBe(2.125);
    });
  });

  // CO (coil) — always 0
  describe('CO (coil)', () => {
    it('always returns 0', () => {
      expect(calculateSpineWidth(60, 'CO')).toBe(0);
      expect(calculateSpineWidth(500, 'CO')).toBe(0);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('0 pages returns 0', () => {
      expect(calculateSpineWidth(0)).toBe(0);
    });

    it('negative pages returns 0', () => {
      expect(calculateSpineWidth(-5)).toBe(0);
    });

    it('defaults to PB when no binding type specified', () => {
      expect(calculateSpineWidth(100)).toBeCloseTo((100 / 444) + 0.06, 6);
    });

    it('null pages returns 0', () => {
      expect(calculateSpineWidth(null)).toBe(0);
    });
  });
});
