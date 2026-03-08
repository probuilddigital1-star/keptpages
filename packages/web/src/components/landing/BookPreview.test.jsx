import { render, screen } from '@testing-library/react';
import BookPreview from './BookPreview';

describe('BookPreview', () => {
  it('renders the section heading', () => {
    render(<BookPreview onCtaClick={vi.fn()} />);
    expect(screen.getByText(/from phone/i)).toBeInTheDocument();
  });

  it('renders the section label', () => {
    render(<BookPreview onCtaClick={vi.fn()} />);
    expect(screen.getByText('The Finished Product')).toBeInTheDocument();
  });

  it('renders the price info', () => {
    render(<BookPreview onCtaClick={vi.fn()} />);
    expect(screen.getByText(/hardcover from/i)).toBeInTheDocument();
    expect(screen.getByText('$79')).toBeInTheDocument();
  });

  it('renders the book title on the 3D book mock', () => {
    render(<BookPreview onCtaClick={vi.fn()} />);
    expect(screen.getByText(/The Rose Family/)).toBeInTheDocument();
  });

  it('renders without crashing when onCtaClick is not provided', () => {
    render(<BookPreview />);
    expect(screen.getByText('The Finished Product')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<BookPreview />);
    expect(screen.getByText(/turn your collection/i)).toBeInTheDocument();
  });

  it('renders "A book they\'ll treasure" sub-heading', () => {
    render(<BookPreview />);
    expect(screen.getByText(/a book they.ll treasure/i)).toBeInTheDocument();
  });
});
