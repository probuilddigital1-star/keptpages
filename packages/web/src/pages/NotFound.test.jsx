import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NotFound from './NotFound';

function renderNotFound() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('NotFound', () => {
  it('renders 404 heading', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    renderNotFound();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderNotFound();
    expect(screen.getByText(/doesn't exist or has been moved/)).toBeInTheDocument();
  });

  it('renders Go Home link', () => {
    renderNotFound();
    const link = screen.getByRole('link', { name: /go home/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders Read Articles link', () => {
    renderNotFound();
    const link = screen.getByRole('link', { name: /read articles/i });
    expect(link).toHaveAttribute('href', '/between-the-pages');
  });

  it('renders book icon SVG', () => {
    renderNotFound();
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
