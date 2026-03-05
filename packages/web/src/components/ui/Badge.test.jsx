import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toMatch(/bg-cream-alt/);
    expect(badge.className).toMatch(/text-walnut-secondary/);
  });

  it('applies terracotta variant styles', () => {
    render(<Badge variant="terracotta">Hot</Badge>);
    const badge = screen.getByText('Hot');
    expect(badge.className).toMatch(/bg-terracotta-light/);
    expect(badge.className).toMatch(/text-terracotta/);
  });

  it('applies sage variant styles', () => {
    render(<Badge variant="sage">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge.className).toMatch(/bg-sage-light/);
    expect(badge.className).toMatch(/text-sage/);
  });

  it('applies gold variant styles', () => {
    render(<Badge variant="gold">Premium</Badge>);
    const badge = screen.getByText('Premium');
    expect(badge.className).toMatch(/bg-gold-light/);
    expect(badge.className).toMatch(/text-gold/);
  });
});
