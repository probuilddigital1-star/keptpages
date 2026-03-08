import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-terracotta/);
    expect(btn.className).toMatch(/text-white/);
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-cream-surface/);
    expect(btn.className).toMatch(/text-walnut/);
    expect(btn.className).toMatch(/border/);
  });

  it('applies light variant classes', () => {
    render(<Button variant="light">Light</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-cream/);
    expect(btn.className).toMatch(/shadow-btn-light/);
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-transparent/);
    expect(btn.className).toMatch(/text-terracotta/);
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/px-4/);
    expect(btn.className).toMatch(/py-1\.5/);
  });

  it('applies md size classes by default', () => {
    render(<Button>Medium</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/px-6/);
    expect(btn.className).toMatch(/py-2\.5/);
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/px-8/);
    expect(btn.className).toMatch(/py-3/);
  });

  it('shows Spinner when loading=true', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('is disabled when loading=true', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('forwards ref', () => {
    const ref = createRef();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('my-custom-class');
  });
});
