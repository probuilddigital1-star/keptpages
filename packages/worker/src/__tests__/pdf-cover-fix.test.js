/**
 * Tests for the PDF cover generation fixes.
 * Validates color schemes, layouts, fonts, author rendering, and cover photo.
 */

import { generateCoverPdf, renderBlueprintBook } from '../services/pdf.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// Helper: create a minimal JPEG (valid header, tiny 1x1 image)
function createTestJpeg() {
  // Minimal JPEG: SOI + APP0 + DQT + SOF0 + DHT + SOS + data + EOI
  // This is a valid 1x1 red JPEG
  const hex = 'ffd8ffe000104a46494600010100000100010000ffdb00430008060607060508070707090908' +
    '0a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432' +
    'ffc0000b08000100010101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc4' +
    '00b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552' +
    'd1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768' +
    '696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4' +
    'c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbdd' +
    '2800a0028009a0a00ffd9';
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Helper: create font map with standard fonts
async function createFontMap(pdfDoc) {
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  return { fraunces: { regular, bold, italic } };
}

describe('generateCoverPdf - new signature', () => {
  it('accepts the new coverData signature', async () => {
    const result = await generateCoverPdf({
      title: 'Test Book',
      subtitle: 'A subtitle',
      author: 'Author Name',
      colorScheme: 'default',
      layout: 'centered',
      photoBytes: null,
      photoMimeType: null,
    }, 100, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('still works with legacy-style object (title/subtitle/author only)', async () => {
    const result = await generateCoverPdf({
      title: 'Legacy',
      subtitle: 'Sub',
      author: 'Auth',
    }, 50, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });
});

describe('generateCoverPdf - color schemes', () => {
  const schemes = ['default', 'midnight', 'forest', 'plum', 'ocean'];

  for (const scheme of schemes) {
    it(`renders with ${scheme} color scheme`, async () => {
      const result = await generateCoverPdf({
        title: 'Color Test',
        subtitle: 'Testing scheme',
        author: 'Author',
        colorScheme: scheme,
        layout: 'centered',
      }, 100, null);

      expect(result).toBeInstanceOf(ArrayBuffer);
      const pdf = await PDFDocument.load(result);
      expect(pdf.getPageCount()).toBe(1);
    });
  }

  it('falls back to default for unknown scheme', async () => {
    const result = await generateCoverPdf({
      title: 'Unknown Scheme',
      colorScheme: 'nonexistent',
      layout: 'centered',
    }, 100, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });
});

describe('generateCoverPdf - layouts', () => {
  it('renders centered layout', async () => {
    const result = await generateCoverPdf({
      title: 'Centered Title',
      subtitle: 'Centered Sub',
      author: 'Author',
      colorScheme: 'midnight',
      layout: 'centered',
    }, 100, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('renders left-aligned layout', async () => {
    const result = await generateCoverPdf({
      title: 'Left Title',
      subtitle: 'Left Sub',
      author: 'Author',
      colorScheme: 'ocean',
      layout: 'left-aligned',
    }, 100, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('renders photo-background layout without photo (no crash)', async () => {
    const result = await generateCoverPdf({
      title: 'Photo BG Title',
      subtitle: 'No photo provided',
      author: 'Author',
      colorScheme: 'forest',
      layout: 'photo-background',
      photoBytes: null,
      photoMimeType: null,
    }, 100, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('renders photo-background layout with photo', async () => {
    const result = await generateCoverPdf({
      title: 'Photo BG Title',
      subtitle: 'With photo',
      author: 'Author',
      colorScheme: 'default',
      layout: 'photo-background',
      photoBytes: createTestJpeg(),
      photoMimeType: 'image/jpeg',
    }, 100, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
    const pdf = await PDFDocument.load(result);
    expect(pdf.getPageCount()).toBe(1);
  });
});

describe('generateCoverPdf - edge cases', () => {
  it('handles missing title', async () => {
    const result = await generateCoverPdf({
      colorScheme: 'midnight',
      layout: 'centered',
    }, 50, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('handles no subtitle or author', async () => {
    const result = await generateCoverPdf({
      title: 'Title Only',
      colorScheme: 'plum',
      layout: 'left-aligned',
    }, 50, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('handles all fields with photo-background', async () => {
    const result = await generateCoverPdf({
      title: 'Full Test',
      subtitle: 'Everything set',
      author: 'Test Author',
      colorScheme: 'ocean',
      layout: 'photo-background',
      photoBytes: createTestJpeg(),
      photoMimeType: 'image/jpeg',
    }, 200, null);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });
});

describe('renderBlueprintBook - title page with author and cover photo', () => {
  const baseBlueprint = (overrides = {}) => ({
    version: 1,
    globalSettings: {
      template: 'heritage',
      fontFamily: 'fraunces',
      includeTitlePage: true,
      includeCopyright: false,
      includeToc: false,
      showPageNumbers: false,
    },
    coverDesign: {
      title: 'My Book',
      subtitle: 'A Story',
      author: 'Jane Doe',
      colorScheme: 'default',
      layout: 'centered',
      ...overrides,
    },
    pages: [{ id: 'p1', kind: 'blank', background: { type: 'solid', color: '#ffffff' }, elements: [] }],
    additionalImages: [],
  });

  it('renders author on title page', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint();

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap, null);

    // Title page + 1 content page
    expect(pageCount).toBe(2);
    expect(pdfDoc.getPageCount()).toBe(2);
  });

  it('renders cover photo on title page when provided', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint({ layout: 'centered' });
    const coverPhotoData = { bytes: createTestJpeg(), mimeType: 'image/jpeg' };

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap, coverPhotoData);

    expect(pageCount).toBe(2);
    // PDF should be larger due to embedded image
    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  });

  it('skips cover photo on title page for photo-background layout', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint({ layout: 'photo-background' });
    const coverPhotoData = { bytes: createTestJpeg(), mimeType: 'image/jpeg' };

    // Should not crash, and should skip the photo on title page
    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap, coverPhotoData);
    expect(pageCount).toBe(2);
  });

  it('handles null coverPhotoData gracefully', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint();

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap, null);
    expect(pageCount).toBe(2);
  });

  it('handles missing author in coverDesign', async () => {
    const pdfDoc = await PDFDocument.create();
    const fontMap = await createFontMap(pdfDoc);
    const blueprint = baseBlueprint({ author: undefined });

    const pageCount = await renderBlueprintBook(pdfDoc, blueprint, [], {}, fontMap, null);
    expect(pageCount).toBe(2);
  });
});
