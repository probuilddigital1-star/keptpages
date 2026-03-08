import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinalCTA from './FinalCTA';

describe('FinalCTA', () => {
  it('renders the heading text', () => {
    render(<FinalCTA onCtaClick={vi.fn()} />);
    // "your family" appears in both the heading and description, use heading role
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/your family/i);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/won't last forever/i);
  });

  it('renders the description text', () => {
    render(<FinalCTA onCtaClick={vi.fn()} />);
    expect(screen.getByText(/but what's written on them can/i)).toBeInTheDocument();
  });

  it('renders the CTA button', () => {
    render(<FinalCTA onCtaClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start preserving/i })).toBeInTheDocument();
  });

  it('renders the no credit card note', () => {
    render(<FinalCTA onCtaClick={vi.fn()} />);
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
  });

  it('calls onCtaClick when the CTA button is clicked', async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(<FinalCTA onCtaClick={handler} />);

    await user.click(screen.getByRole('button', { name: /start preserving/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not crash when onCtaClick is undefined', async () => {
    const user = userEvent.setup();
    render(<FinalCTA />);

    // Clicking the button should not throw even without handler
    const btn = screen.getByRole('button', { name: /start preserving/i });
    await user.click(btn);
    // No crash = pass
  });

  it('has the signup section id for anchor links', () => {
    const { container } = render(<FinalCTA onCtaClick={vi.fn()} />);
    const section = container.querySelector('#signup');
    expect(section).toBeInTheDocument();
  });
});
