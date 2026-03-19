import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import Nav from './Nav';

describe('Nav', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders KeptPages logo', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />);
    expect(screen.getByText(/Kept/)).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders "Get Started" button', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('calls onCtaClick when button is clicked', async () => {
    const handleClick = vi.fn();
    renderWithRouter(<Nav onCtaClick={handleClick} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /get started/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('starts transparent (no solid background)', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('bg-transparent');
  });

  it('adds solid background after scroll past 40px', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />);
    const nav = screen.getByRole('navigation');

    // Simulate scroll past 40px
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
    fireEvent.scroll(window);

    expect(nav).toHaveClass('bg-cream/95');
    expect(nav).not.toHaveClass('bg-transparent');
  });

  it('removes solid background when scrolled back to top', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />);
    const nav = screen.getByRole('navigation');

    // Scroll down
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
    fireEvent.scroll(window);
    expect(nav).toHaveClass('bg-cream/95');

    // Scroll back up
    Object.defineProperty(window, 'scrollY', { value: 10, writable: true });
    fireEvent.scroll(window);
    expect(nav).toHaveClass('bg-transparent');
    expect(nav).not.toHaveClass('bg-cream/95');
  });

  it('renders "Between the Pages" link on desktop', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />);
    const links = screen.getAllByText(/between the pages/i);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('renders section anchor links on landing page', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />, { route: '/' });
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
  });

  it('does not render section anchor links on articles page', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />, { route: '/between-the-pages/some-article' });
    expect(screen.queryByText('How It Works')).not.toBeInTheDocument();
    expect(screen.queryByText('Pricing')).not.toBeInTheDocument();
  });

  it('anchor links have correct hrefs', () => {
    renderWithRouter(<Nav onCtaClick={vi.fn()} />, { route: '/' });
    expect(screen.getByText('How It Works').closest('a')).toHaveAttribute('href', '#how-it-works');
    expect(screen.getByText('Pricing').closest('a')).toHaveAttribute('href', '#pricing');
  });
});
