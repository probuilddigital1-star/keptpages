export const ARTICLE_CATEGORIES = [
  { slug: 'preservation', label: 'Preservation' },
  { slug: 'family-stories', label: 'Family Stories' },
  { slug: 'product-guides', label: 'Product Guides' },
];

export const CATEGORY_MAP = Object.fromEntries(
  ARTICLE_CATEGORIES.map((c) => [c.slug, c.label])
);
