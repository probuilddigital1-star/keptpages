import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollectionCard from './CollectionCard';

// Mock the formatters utility
vi.mock('@/utils/formatters', () => ({
  relativeTime: vi.fn((date) => '2 hours ago'),
  truncate: vi.fn((str) => str),
}));

const baseCollection = {
  id: 'col-123',
  name: 'Grandma\u2019s Recipes',
  description: 'Handed down through generations',
  coverImageUrl: null,
  itemCount: 5,
  updatedAt: '2026-02-25T12:00:00Z',
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <CollectionCard collection={baseCollection} {...props} />
    </MemoryRouter>
  );
}

describe('CollectionCard', () => {
  it('renders collection name', () => {
    renderCard();
    expect(screen.getByText('Grandma\u2019s Recipes')).toBeInTheDocument();
  });

  it('renders document count badge', () => {
    renderCard();
    expect(screen.getByText('5 documents')).toBeInTheDocument();
  });

  it('renders singular "document" for count of 1', () => {
    renderCard({ collection: { ...baseCollection, itemCount: 1 } });
    expect(screen.getByText('1 document')).toBeInTheDocument();
  });

  it('renders relative time', () => {
    renderCard();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('shows placeholder when no cover image', () => {
    renderCard();
    // When no cover_image_url, an SVG placeholder is rendered instead of an img
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows cover image when coverImageUrl is provided', () => {
    renderCard({
      collection: {
        ...baseCollection,
        coverImageUrl: 'https://example.com/photo.jpg',
      },
    });
    const img = screen.getByRole('img', { name: 'Grandma\u2019s Recipes' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('links to /app/collection/:id', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/app/collection/col-123');
  });

  it('renders description text', () => {
    renderCard();
    expect(screen.getByText('Handed down through generations')).toBeInTheDocument();
  });

  it('renders as a button when onClick is provided', () => {
    const handleClick = vi.fn();
    renderCard({ onClick: handleClick });
    // Should not render a link
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    // Should render a button wrapping the content
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
