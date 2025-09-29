import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    test('renders with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    test('renders with correct type attribute', () => {
      const { rerender } = render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

      rerender(<Button type="button">Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    test('forwards ref correctly', () => {
      const ref = React.createRef();
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  // Variant Tests
  describe('Variants', () => {
    test('applies primary variant styles', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    test('applies secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100', 'text-gray-900');
    });

    test('applies tertiary variant styles', () => {
      render(<Button variant="tertiary">Tertiary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'text-gray-600');
    });

    test('applies destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });
  });

  // Size Tests
  describe('Sizes', () => {
    test('applies small size styles', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-3', 'text-sm');
    });

    test('applies medium size styles', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-4', 'text-base');
    });

    test('applies large size styles', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12', 'px-6', 'text-lg');
    });

    test('meets minimum touch target size (44x44px)', () => {
      const { container } = render(<Button size="md">Touch Target</Button>);
      const button = container.querySelector('button');
      const styles = window.getComputedStyle(button);
      // h-11 = 44px height
      expect(button).toHaveClass('h-11');
    });
  });

  // State Tests
  describe('States', () => {
    test('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('shows loading state with spinner', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    test('hides children when loading', () => {
      render(<Button loading>Submit</Button>);
      const textSpan = screen.getByText('Submit');
      expect(textSpan).toHaveClass('opacity-0');
    });

    test('prevents click when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('prevents click when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Icon Tests
  describe('Icons', () => {
    test('renders leading icon', () => {
      const Icon = () => <svg data-testid="icon">Icon</svg>;
      render(<Button leadingIcon={<Icon />}>With Icon</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button.firstChild).toContainElement(screen.getByTestId('icon'));
    });

    test('renders trailing icon', () => {
      const Icon = () => <svg data-testid="icon">Icon</svg>;
      render(<Button trailingIcon={<Icon />}>With Icon</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button.lastChild).toContainElement(screen.getByTestId('icon'));
    });

    test('renders both icons', () => {
      const LeadingIcon = () => <svg data-testid="leading">L</svg>;
      const TrailingIcon = () => <svg data-testid="trailing">T</svg>;
      render(
        <Button leadingIcon={<LeadingIcon />} trailingIcon={<TrailingIcon />}>
          Both Icons
        </Button>
      );
      expect(screen.getByTestId('leading')).toBeInTheDocument();
      expect(screen.getByTestId('trailing')).toBeInTheDocument();
    });

    test('icons scale with button size', () => {
      const Icon = () => <svg data-testid="icon">Icon</svg>;
      const { rerender } = render(
        <Button size="sm" leadingIcon={<Icon />}>Small</Button>
      );
      expect(screen.getByTestId('icon').parentElement).toHaveClass('w-4', 'h-4');

      rerender(<Button size="lg" leadingIcon={<Icon />}>Large</Button>);
      expect(screen.getByTestId('icon').parentElement).toHaveClass('w-5', 'h-5');
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    test('calls onClick handler', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('supports keyboard activation', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });

    test('maintains focus state', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
      expect(button).toHaveClass('focus:ring-2');
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    test('has proper ARIA attributes when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('has proper ARIA attributes when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('maintains button role', () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('supports aria-label', () => {
      render(<Button aria-label="Save document">Save</Button>);
      expect(screen.getByLabelText('Save document')).toBeInTheDocument();
    });

    test('supports aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="help-text">Submit</Button>
          <span id="help-text">Press to submit the form</span>
        </>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });
  });

  // Custom Class Tests
  describe('Custom Classes', () => {
    test('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    test('merges custom className with default styles', () => {
      render(<Button className="mt-4" variant="primary">Merged</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mt-4', 'bg-blue-600');
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    test('handles empty children', () => {
      render(<Button />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('handles complex children', () => {
      render(
        <Button>
          <span>Complex</span>
          <strong>Children</strong>
        </Button>
      );
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Children')).toBeInTheDocument();
    });

    test('prevents double submit when loading', async () => {
      const handleClick = jest.fn();
      const { rerender } = render(<Button onClick={handleClick}>Submit</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);

      rerender(<Button loading onClick={handleClick}>Submit</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  // Integration Tests
  describe('Integration', () => {
    test('works in a form', () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleSubmit).toHaveBeenCalled();
    });

    test('supports controlled loading state', () => {
      const Component = () => {
        const [loading, setLoading] = React.useState(false);
        return (
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 100);
            }}
          >
            Async Action
          </Button>
        );
      };

      render(<Component />);
      const button = screen.getByRole('button');

      expect(button).not.toHaveAttribute('aria-busy');
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});