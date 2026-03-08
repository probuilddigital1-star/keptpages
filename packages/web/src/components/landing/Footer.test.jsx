import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the KeptPages branding', () => {
    render(<Footer />);
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders privacy, terms, and contact links', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders the copyright notice with correct year', () => {
    render(<Footer />);
    expect(screen.getByText(/2026 keptpages/i)).toBeInTheDocument();
  });

  it('footer links are anchor elements', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(3);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '#');
    });
  });
});
