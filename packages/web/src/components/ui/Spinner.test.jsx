import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders with role="status"', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies sm size classes', () => {
    render(<Spinner size="sm" />);
    const spinner = screen.getByRole('status');
    expect(spinner.className).toMatch(/h-4/);
    expect(spinner.className).toMatch(/w-4/);
  });

  it('applies md size classes by default', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner.className).toMatch(/h-6/);
    expect(spinner.className).toMatch(/w-6/);
  });

  it('applies lg size classes', () => {
    render(<Spinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner.className).toMatch(/h-10/);
    expect(spinner.className).toMatch(/w-10/);
  });

  it('has accessible label', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});
