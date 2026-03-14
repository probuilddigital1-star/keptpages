import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pricing from './Pricing';

describe('Pricing', () => {
  it('renders section heading text', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText(/honest prices/i)).toBeInTheDocument();
  });

  it('renders subheading about free scanning', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText(/scan for free/i)).toBeInTheDocument();
  });

  it('renders all three book tier names', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Heirloom')).toBeInTheDocument();
  });

  it('renders book tier prices', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('$39')).toBeInTheDocument();
    expect(screen.getByText('$69')).toBeInTheDocument();
    expect(screen.getByText('$79')).toBeInTheDocument();
  });

  it('renders "Most Popular" badge on Premium tier', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('renders extra page pricing', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    const extraPageTexts = screen.getAllByText(/\+\$0\.35\/page over 60/);
    expect(extraPageTexts.length).toBe(3);
  });

  it('renders add-on options', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText(/glossy cover finish/i)).toBeInTheDocument();
    expect(screen.getByText(/coil binding/i)).toBeInTheDocument();
    expect(screen.getAllByText(/color interior/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Keeper Pass callout with price', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Keeper Pass')).toBeInTheDocument();
    expect(screen.getByText('$59')).toBeInTheDocument();
  });

  it('renders Keeper Pass as one-time, not subscription', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText(/not a subscription/i)).toBeInTheDocument();
  });

  it('renders Keeper Pass features', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText('Unlimited scans')).toBeInTheDocument();
    expect(screen.getByText('Unlimited collections')).toBeInTheDocument();
    expect(screen.getByText('Full PDF export')).toBeInTheDocument();
    expect(screen.getByText('Family sharing')).toBeInTheDocument();
    expect(screen.getByText('15% off all books forever')).toBeInTheDocument();
  });

  it('renders free tier messaging', () => {
    render(<Pricing onCtaClick={vi.fn()} />);
    expect(screen.getByText(/start free/i)).toBeInTheDocument();
    expect(screen.getByText(/25 scans/i)).toBeInTheDocument();
    expect(screen.getByText(/no credit card/i)).toBeInTheDocument();
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
});
