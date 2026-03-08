// Book designer constants

export const CANVAS_WIDTH = 850;
export const CANVAS_HEIGHT = 1100;

// PDF dimensions in points (8.5" x 11" at 72dpi)
export const PDF_WIDTH = 612;
export const PDF_HEIGHT = 792;

export const PAGE_KINDS = [
  { id: 'document', label: 'Document', icon: 'file-text', description: 'Auto-populated from collection item' },
  { id: 'custom-text', label: 'Custom Text', icon: 'type', description: 'Free-form text page' },
  { id: 'photo', label: 'Photo', icon: 'image', description: 'Single large photo with optional caption' },
  { id: 'photo-collage', label: 'Photo Collage', icon: 'layout', description: 'Multiple photos in a grid layout' },
  { id: 'section-divider', label: 'Section Divider', icon: 'minus', description: 'Chapter or section separator' },
  { id: 'dedication', label: 'Dedication', icon: 'heart', description: 'Dedication or memorial page' },
  { id: 'blank', label: 'Blank', icon: 'square', description: 'Empty page — add anything' },
];

export const TEMPLATES = [
  { id: 'heritage', name: 'Heritage', description: 'Warm vintage tones with ornamental borders.', swatches: ['#c2891f', '#733819', '#b8933d'], pageBg: '#FDF6EC', titleColor: '#733819', bodyColor: '#3a2a1a', accentColor: '#c2891f' },
  { id: 'garden', name: 'Garden', description: 'Rustic farmhouse feel with sage greens.', swatches: ['#8cad6b', '#426140', '#705c47'], pageBg: '#F4F7F0', titleColor: '#426140', bodyColor: '#2e3a28', accentColor: '#8cad6b' },
  { id: 'heirloom', name: 'Heirloom', description: 'Cool elegant navy and gold.', swatches: ['#bfa138', '#1f2952', '#b3a673'], pageBg: '#F5F3EE', titleColor: '#1f2952', bodyColor: '#2a2a3a', accentColor: '#bfa138' },
  { id: 'parchment', name: 'Parchment', description: 'Aged paper warmth with sepia tones.', swatches: ['#ad853d', '#664720', '#b89e70'], pageBg: '#F7F1E3', titleColor: '#664720', bodyColor: '#4a3a28', accentColor: '#ad853d' },
  { id: 'modern', name: 'Modern', description: 'Clean contemporary layout with bold accents.', swatches: ['#c26138', '#141414', '#c7c7c7'], pageBg: '#FFFFFF', titleColor: '#141414', bodyColor: '#333333', accentColor: '#c26138' },
];

export const COLOR_SCHEMES = [
  { id: 'default', label: 'Classic Cream', bg: '#FAF4E8', accent: '#C65D3E' },
  { id: 'midnight', label: 'Midnight', bg: '#1a1a2e', accent: '#e2b04a' },
  { id: 'forest', label: 'Forest', bg: '#f0f4f0', accent: '#2d5a3d' },
  { id: 'plum', label: 'Plum', bg: '#f8f0f6', accent: '#7b3f6e' },
  { id: 'ocean', label: 'Ocean', bg: '#eef4f8', accent: '#2a6496' },
];

export const FONTS = [
  { id: 'fraunces', label: 'Fraunces', family: "'Fraunces', serif", category: 'serif' },
  { id: 'newsreader', label: 'Newsreader', family: "'Newsreader', serif", category: 'serif' },
  { id: 'caveat', label: 'Caveat', family: "'Caveat', cursive", category: 'handwriting' },
  { id: 'outfit', label: 'Outfit', family: "'Outfit', sans-serif", category: 'sans-serif' },
];

export const TEXTURES = [
  { id: 'none', label: 'None' },
  { id: 'linen', label: 'Linen' },
  { id: 'paper-grain', label: 'Paper Grain' },
  { id: 'watercolor-wash', label: 'Watercolor Wash' },
  { id: 'parchment', label: 'Parchment' },
];

export const FRAME_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'simple', label: 'Simple' },
  { id: 'double', label: 'Double' },
  { id: 'ornate', label: 'Ornate' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'shadow', label: 'Shadow' },
];

export const TEXT_PRESETS = [
  { id: 'prose', label: 'Prose', fontFamily: null, fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', alignment: 'left' },
  { id: 'quote', label: 'Quote', fontFamily: null, fontSize: 18, fontWeight: 'normal', fontStyle: 'italic', alignment: 'center' },
  { id: 'poem', label: 'Poem', fontFamily: null, fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', alignment: 'center' },
  { id: 'handwritten', label: 'Handwritten', fontFamily: 'caveat', fontSize: 18, fontWeight: 'normal', fontStyle: 'normal', alignment: 'left' },
];

export const COVER_LAYOUTS = [
  { id: 'centered', label: 'Centered', description: 'Classic centered title and author' },
  { id: 'left-aligned', label: 'Left Aligned', description: 'Title and author on the left' },
  { id: 'photo-background', label: 'Photo Background', description: 'Full-bleed photo with overlay text' },
];

// Collage layout presets — normalized coordinates for image slots
export const COLLAGE_LAYOUTS = {
  '2-grid': [
    { x: 0.05, y: 0.05, width: 0.43, height: 0.9 },
    { x: 0.52, y: 0.05, width: 0.43, height: 0.9 },
  ],
  '3-grid': [
    { x: 0.05, y: 0.05, width: 0.9, height: 0.45 },
    { x: 0.05, y: 0.53, width: 0.43, height: 0.42 },
    { x: 0.52, y: 0.53, width: 0.43, height: 0.42 },
  ],
  '4-grid': [
    { x: 0.05, y: 0.05, width: 0.43, height: 0.43 },
    { x: 0.52, y: 0.05, width: 0.43, height: 0.43 },
    { x: 0.05, y: 0.52, width: 0.43, height: 0.43 },
    { x: 0.52, y: 0.52, width: 0.43, height: 0.43 },
  ],
  '2-row': [
    { x: 0.05, y: 0.05, width: 0.9, height: 0.43 },
    { x: 0.05, y: 0.52, width: 0.9, height: 0.43 },
  ],
  'feature+2': [
    { x: 0.05, y: 0.05, width: 0.55, height: 0.9 },
    { x: 0.64, y: 0.05, width: 0.31, height: 0.43 },
    { x: 0.64, y: 0.52, width: 0.31, height: 0.43 },
  ],
};

// Default element layouts per page kind
export function getDefaultElements(kind, document) {
  const id = () => crypto.randomUUID();

  switch (kind) {
    case 'document':
      return [
        {
          id: id(), type: 'text', x: 0.1, y: 0.06, width: 0.8, height: 0.06,
          text: document?.title || 'Document Title', fontSize: 28, fontWeight: 'bold',
          alignment: 'center', color: '#2C1810',
        },
        {
          id: id(), type: 'text', x: 0.1, y: 0.14, width: 0.8, height: 0.78,
          text: document?.content || 'Document content will appear here.',
          fontSize: 14, alignment: 'left', color: '#3a2a1a',
        },
      ];

    case 'custom-text':
      return [
        {
          id: id(), type: 'text', x: 0.2, y: 0.15, width: 0.6, height: 0.06,
          text: 'Page Title', fontSize: 24, fontWeight: 'bold',
          alignment: 'center', color: '#2C1810',
        },
        {
          id: id(), type: 'text', x: 0.1, y: 0.25, width: 0.8, height: 0.6,
          text: 'Start typing your text here...', fontSize: 14,
          alignment: 'left', color: '#3a2a1a',
        },
      ];

    case 'photo':
      return [
        {
          id: id(), type: 'image', x: 0.1, y: 0.08, width: 0.8, height: 0.72,
          imageKey: null, frameStyle: 'simple',
        },
        {
          id: id(), type: 'text', x: 0.15, y: 0.84, width: 0.7, height: 0.05,
          text: 'Photo caption', fontSize: 12, fontStyle: 'italic',
          alignment: 'center', color: '#666',
        },
      ];

    case 'photo-collage': {
      const layout = COLLAGE_LAYOUTS['4-grid'];
      return layout.map((slot) => ({
        id: id(), type: 'image', ...slot, imageKey: null, frameStyle: 'none',
      }));
    }

    case 'section-divider':
      return [
        {
          id: id(), type: 'text', x: 0.15, y: 0.38, width: 0.7, height: 0.08,
          text: 'Section Title', fontSize: 32, fontWeight: 'bold',
          alignment: 'center', color: '#2C1810',
        },
        {
          id: id(), type: 'decorative', x: 0.3, y: 0.48, width: 0.4, height: 0.01,
          shapeType: 'line', stroke: '#c2891f', strokeWidth: 2,
        },
        {
          id: id(), type: 'text', x: 0.2, y: 0.52, width: 0.6, height: 0.05,
          text: 'Subtitle or description', fontSize: 14, fontStyle: 'italic',
          alignment: 'center', color: '#666',
        },
      ];

    case 'dedication':
      return [
        {
          id: id(), type: 'decorative', x: 0.4, y: 0.2, width: 0.2, height: 0.02,
          shapeType: 'line', stroke: '#c2891f', strokeWidth: 1,
        },
        {
          id: id(), type: 'text', x: 0.15, y: 0.3, width: 0.7, height: 0.4,
          text: 'For those who came before us,\nand those who will carry these stories forward.',
          fontSize: 18, fontStyle: 'italic', alignment: 'center', color: '#2C1810',
        },
        {
          id: id(), type: 'decorative', x: 0.4, y: 0.75, width: 0.2, height: 0.02,
          shapeType: 'line', stroke: '#c2891f', strokeWidth: 1,
        },
      ];

    case 'blank':
    default:
      return [];
  }
}

// Create a new page with defaults
export function createPage(kind, document = null) {
  return {
    id: crypto.randomUUID(),
    kind,
    documentId: document?.id || null,
    background: { type: 'solid', color: '#ffffff' },
    elements: getDefaultElements(kind, document),
  };
}

// Create initial blueprint from collection documents
export function createInitialBlueprint(documents = [], existingCover = {}) {
  const pages = documents.map((doc) => createPage('document', doc));

  return {
    version: 1,
    globalSettings: {
      template: 'heritage',
      fontFamily: 'fraunces',
      includeTitlePage: true,
      includeCopyright: true,
      includeToc: true,
      showPageNumbers: true,
      headerText: '',
      footerText: '',
    },
    coverDesign: {
      title: existingCover.title || '',
      subtitle: existingCover.subtitle || '',
      author: '',
      photoKey: existingCover.photoKey || null,
      photoMimeType: existingCover.photoMimeType || null,
      colorScheme: existingCover.colorScheme || 'default',
      layout: 'centered',
    },
    pages,
    additionalImages: [],
  };
}
