import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('links label to input via htmlFor/id', () => {
    render(<Input label="Email" id="email-field" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input.id).toBe('email-field');
  });

  it('shows error message when error prop is set', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error styles when error prop is set', () => {
    render(<Input error="Bad input" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-red-400/);
  });

  it('applies normal border when no error', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-border/);
    expect(input.className).not.toMatch(/border-red-400/);
  });

  it('forwards ref', () => {
    const ref = createRef();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes ...rest props (placeholder, type, etc.)', () => {
    render(<Input placeholder="Enter email" type="email" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('is disabled when disabled=true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('sets aria-invalid and aria-describedby when error is present', () => {
    render(<Input label="Name" id="name" error="Required" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'name-error');
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Required');
    expect(errorEl).toHaveAttribute('id', 'name-error');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input label="Name" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});
