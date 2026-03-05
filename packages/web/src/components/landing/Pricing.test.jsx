import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pricing from './Pricing';

describe('Pricing', () => {
  it('renders "Free Forever" tier', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Free Forever')).toBeInTheDocument();
  });

  it('renders "$0" price', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('renders "to start" label next to price', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('to start')).toBeInTheDocument();
  });

  it('renders "$39.99" Keeper price', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText(/\$39\.99/)).toBeInTheDocument();
  });

  it('renders Keeper Plan name', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Keeper Plan')).toBeInTheDocument();
  });

  it('renders feature list items', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('25 free scans')).toBeInTheDocument();
    expect(screen.getByText('1 collection')).toBeInTheDocument();
    expect(screen.getByText('PDF export')).toBeInTheDocument();
    expect(screen.getByText('No credit card required')).toBeInTheDocument();
  });

  it('renders CTA button', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /get started free/i })
    ).toBeInTheDocument();
  });

  it('CTA button calls onCtaClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Pricing onCtaClick={handleClick} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /get started free/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders section heading text', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Simple Pricing')).toBeInTheDocument();
    expect(screen.getByText(/start free/i)).toBeInTheDocument();
  });
});
