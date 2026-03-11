import { screen } from '@testing-library/react';
import { renderWithRouter } from '@/test/helpers';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the KeptPages branding', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders privacy, terms, and contact links', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders the copyright notice with correct year', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/2026 keptpages/i)).toBeInTheDocument();
  });

  it('footer links include Between the Pages and anchor links', () => {
    renderWithRouter(<Footer />);
    const links = screen.getAllByRole('link');
    // KeptPages logo + Between the Pages + Privacy + Terms + Contact = 5
    expect(links.length).toBe(5);
    expect(screen.getByText('Between the Pages')).toBeInTheDocument();
  });
});
