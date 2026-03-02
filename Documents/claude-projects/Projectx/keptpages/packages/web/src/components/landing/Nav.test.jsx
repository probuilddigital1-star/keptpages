import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nav from './Nav';

describe('Nav', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders KeptPages logo', () => {
    render(<Nav onCtaClick={vi.fn()} />);
    expect(screen.getByText(/Kept/)).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders "Join Waitlist" button', () => {
    render(<Nav onCtaClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
  });

  it('calls onCtaClick when button is clicked', async () => {
    const handleClick = vi.fn();
    render(<Nav onCtaClick={handleClick} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('starts transparent (no solid background)', () => {
    render(<Nav onCtaClick={vi.fn()} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('bg-transparent');
  });

  it('adds solid background after scroll past 40px', () => {
    render(<Nav onCtaClick={vi.fn()} />);
    const nav = screen.getByRole('navigation');

    // Simulate scroll past 40px
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
    fireEvent.scroll(window);

    expect(nav).toHaveClass('bg-cream/95');
    expect(nav).not.toHaveClass('bg-transparent');
  });

  it('removes solid background when scrolled back to top', () => {
    render(<Nav onCtaClick={vi.fn()} />);
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
});
