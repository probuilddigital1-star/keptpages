import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Hero from './Hero';

describe('Hero', () => {
  it('renders the headline text', () => {
    render(<Hero onCtaClick={vi.fn()} />);
    // The headline is composed of individual word spans
    expect(screen.getByText('Every')).toBeInTheDocument();
    expect(screen.getByText('family')).toBeInTheDocument();
    expect(screen.getByText('has')).toBeInTheDocument();
    expect(screen.getByText('pages')).toBeInTheDocument();
    expect(screen.getByText('worth')).toBeInTheDocument();
    expect(screen.getByText('keeping.')).toBeInTheDocument();
  });

  it('renders the section label text', () => {
    render(<Hero onCtaClick={vi.fn()} />);
    expect(screen.getByText('Preserve What Matters')).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<Hero onCtaClick={vi.fn()} />);
    expect(
      screen.getByText(/snap a photo of grandma/i)
    ).toBeInTheDocument();
  });

  it('renders the CTA button', () => {
    render(<Hero onCtaClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /start preserving/i })
    ).toBeInTheDocument();
  });

  it('renders the "no credit card" note', () => {
    render(<Hero onCtaClick={vi.fn()} />);
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/25 free scans/i)).toBeInTheDocument();
  });

  it('CTA button calls onCtaClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Hero onCtaClick={handleClick} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /start preserving/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
