import { describe, it, expect, vi } from 'vitest';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PDF_WIDTH,
  PDF_HEIGHT,
  PAGE_KINDS,
  TEMPLATES,
  COLOR_SCHEMES,
  FONTS,
  TEXTURES,
  FRAME_STYLES,
  TEXT_PRESETS,
  COVER_LAYOUTS,
  COLLAGE_LAYOUTS,
  getDefaultElements,
  createPage,
  createInitialBlueprint,
} from './constants';

// Stub crypto.randomUUID for deterministic tests
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-uuid') });

describe('Book designer constants', () => {
  describe('canvas / PDF dimensions', () => {
    it('has standard canvas dimensions', () => {
      expect(CANVAS_WIDTH).toBe(850);
      expect(CANVAS_HEIGHT).toBe(1100);
    });

    it('has correct PDF dimensions for 8.5x11 at 72dpi', () => {
      expect(PDF_WIDTH).toBe(612);
      expect(PDF_HEIGHT).toBe(792);
    });
  });

  describe('PAGE_KINDS', () => {
    it('has expected page kinds', () => {
      const ids = PAGE_KINDS.map((p) => p.id);
      expect(ids).toContain('document');
      expect(ids).toContain('custom-text');
      expect(ids).toContain('photo');
      expect(ids).toContain('photo-collage');
      expect(ids).toContain('section-divider');
      expect(ids).toContain('dedication');
      expect(ids).toContain('blank');
    });

    it('each kind has label, icon, and description', () => {
      for (const kind of PAGE_KINDS) {
        expect(kind.label).toBeTruthy();
        expect(kind.icon).toBeTruthy();
        expect(kind.description).toBeTruthy();
      }
    });
  });

  describe('TEMPLATES', () => {
    it('has required color fields for each template', () => {
      for (const tpl of TEMPLATES) {
        expect(tpl.id).toBeTruthy();
        expect(tpl.name).toBeTruthy();
        expect(tpl.pageBg).toMatch(/^#/);
        expect(tpl.titleColor).toMatch(/^#/);
        expect(tpl.bodyColor).toMatch(/^#/);
        expect(tpl.accentColor).toMatch(/^#/);
        expect(tpl.swatches).toHaveLength(3);
      }
    });
  });

  describe('COLOR_SCHEMES', () => {
    it('has id, label, bg, and accent for each scheme', () => {
      for (const cs of COLOR_SCHEMES) {
        expect(cs.id).toBeTruthy();
        expect(cs.label).toBeTruthy();
        expect(cs.bg).toMatch(/^#/);
        expect(cs.accent).toMatch(/^#/);
      }
    });

    it('includes a default scheme', () => {
      expect(COLOR_SCHEMES.find((c) => c.id === 'default')).toBeTruthy();
    });
  });

  describe('FONTS', () => {
    it('each font has id, label, family, category', () => {
      for (const f of FONTS) {
        expect(f.id).toBeTruthy();
        expect(f.label).toBeTruthy();
        expect(f.family).toBeTruthy();
        expect(f.category).toBeTruthy();
      }
    });
  });

  describe('COLLAGE_LAYOUTS', () => {
    it('has normalized coordinates between 0 and 1', () => {
      for (const [name, slots] of Object.entries(COLLAGE_LAYOUTS)) {
        expect(slots.length).toBeGreaterThan(0);
        for (const slot of slots) {
          expect(slot.x).toBeGreaterThanOrEqual(0);
          expect(slot.x).toBeLessThanOrEqual(1);
          expect(slot.y).toBeGreaterThanOrEqual(0);
          expect(slot.y).toBeLessThanOrEqual(1);
          expect(slot.width).toBeGreaterThan(0);
          expect(slot.height).toBeGreaterThan(0);
        }
      }
    });

    it('4-grid has 4 slots', () => {
      expect(COLLAGE_LAYOUTS['4-grid']).toHaveLength(4);
    });
  });

  describe('getDefaultElements', () => {
    it('returns elements with title and content for document kind', () => {
      const doc = { title: 'My Doc', content: 'Hello world' };
      const elements = getDefaultElements('document', doc);
      expect(elements).toHaveLength(2);
      expect(elements[0].type).toBe('text');
      expect(elements[0].text).toBe('My Doc');
      expect(elements[1].text).toBe('Hello world');
    });

    it('returns image + caption for photo kind', () => {
      const elements = getDefaultElements('photo');
      expect(elements.some((e) => e.type === 'image')).toBe(true);
      expect(elements.some((e) => e.type === 'text')).toBe(true);
    });

    it('returns 4 image elements for photo-collage kind', () => {
      const elements = getDefaultElements('photo-collage');
      expect(elements).toHaveLength(4);
      elements.forEach((e) => expect(e.type).toBe('image'));
    });

    it('returns empty array for blank kind', () => {
      expect(getDefaultElements('blank')).toEqual([]);
    });

    it('returns decorative elements for section-divider', () => {
      const elements = getDefaultElements('section-divider');
      expect(elements.some((e) => e.type === 'decorative')).toBe(true);
    });

    it('returns decorative elements for dedication', () => {
      const elements = getDefaultElements('dedication');
      expect(elements.some((e) => e.type === 'decorative')).toBe(true);
      expect(elements.some((e) => e.fontStyle === 'italic')).toBe(true);
    });

    it('uses fallback text when no document provided', () => {
      const elements = getDefaultElements('document');
      expect(elements[0].text).toBe('Document Title');
      expect(elements[1].text).toContain('Document content');
    });
  });

  describe('createPage', () => {
    it('creates a page with correct structure', () => {
      const page = createPage('custom-text');
      expect(page.id).toBe('test-uuid');
      expect(page.kind).toBe('custom-text');
      expect(page.documentId).toBeNull();
      expect(page.background).toEqual({ type: 'solid', color: '#ffffff' });
      expect(page.elements.length).toBeGreaterThan(0);
    });

    it('associates documentId when document provided', () => {
      const page = createPage('document', { id: 'doc-123', title: 'Test' });
      expect(page.documentId).toBe('doc-123');
    });
  });

  describe('createInitialBlueprint', () => {
    it('creates a blueprint with global settings and cover design', () => {
      const bp = createInitialBlueprint();
      expect(bp.version).toBe(1);
      expect(bp.globalSettings).toBeDefined();
      expect(bp.globalSettings.template).toBe('heritage');
      expect(bp.globalSettings.fontFamily).toBe('fraunces');
      expect(bp.coverDesign).toBeDefined();
      expect(bp.pages).toEqual([]);
      expect(bp.additionalImages).toEqual([]);
    });

    it('creates pages from documents', () => {
      const docs = [
        { id: 'doc-1', title: 'First', content: 'Content 1' },
        { id: 'doc-2', title: 'Second', content: 'Content 2' },
      ];
      const bp = createInitialBlueprint(docs);
      expect(bp.pages).toHaveLength(2);
      expect(bp.pages[0].kind).toBe('document');
      expect(bp.pages[0].documentId).toBe('doc-1');
    });

    it('uses existing cover data when provided', () => {
      const cover = { title: 'My Book', subtitle: 'A Story', photoKey: 'key-1', colorScheme: 'midnight' };
      const bp = createInitialBlueprint([], cover);
      expect(bp.coverDesign.title).toBe('My Book');
      expect(bp.coverDesign.subtitle).toBe('A Story');
      expect(bp.coverDesign.photoKey).toBe('key-1');
      expect(bp.coverDesign.colorScheme).toBe('midnight');
    });
  });
});
