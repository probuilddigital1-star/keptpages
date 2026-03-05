import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('has surface background and border classes', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card.className).toMatch(/bg-cream-surface/);
    expect(card.className).toMatch(/border/);
    expect(card.className).toMatch(/border-border-light/);
  });

  it('applies hover classes when hover=true', () => {
    const { container } = render(<Card hover>Hoverable</Card>);
    const card = container.firstChild;
    expect(card.className).toMatch(/hover:-translate-y-0\.5/);
    expect(card.className).toMatch(/hover:shadow-md/);
    expect(card.className).toMatch(/cursor-pointer/);
  });

  it('does NOT apply hover classes when hover is false/undefined', () => {
    const { container } = render(<Card>Static</Card>);
    const card = container.firstChild;
    expect(card.className).not.toMatch(/hover:-translate-y-0\.5/);
    expect(card.className).not.toMatch(/cursor-pointer/);
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="p-8">Padded</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('p-8');
    // Should still have base classes
    expect(card.className).toMatch(/bg-cream-surface/);
  });
});
